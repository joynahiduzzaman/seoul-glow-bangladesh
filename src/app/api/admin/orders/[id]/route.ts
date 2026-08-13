import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { applyOrderStatusChange } from "@/server/order-status-change";
import { ORDER_STATUSES, PAYMENT_STATUSES, STOCK_RESTORE_STATUSES, canTransitionStatus, validNextStatuses } from "@/lib/order-status";
import { z } from "zod";

const schema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  assignedStaffId: z.string().nullable().optional(),
  // Money. Both columns already existed and were set once at checkout with no
  // way to correct them afterwards — a customer haggling on the phone, or a
  // waived delivery charge, meant cancelling and re-recording the whole order.
  discount: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
});

/** Statuses past which the amount owed is settled and shouldn't drift. */
const PRICE_LOCKED_STATUSES = ["DELIVERED", "RETURNED", "REFUNDED", "CANCELLED"];

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// GET — full order detail for the admin drawer: items, customer, assigned staff,
// timeline, plus the staff roster for the assignment dropdown (avoids a second
// round trip for what's otherwise a tiny lookup list).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const [order, staff] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: { select: { slug: true } } } },
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        assignedStaff: { select: { id: true, name: true } },
        createdByStaff: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { id: true, name: true } } } },
        shipment: { include: { assignedBy: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "MANAGER", "STAFF"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Same customer count a customer's own order history would show — lets the
  // drawer say "3rd order from this customer" using real data, not a guess.
  const customerOrderCount = order.userId ? await prisma.order.count({ where: { userId: order.userId } }) : null;

  return NextResponse.json({ order, staff, customerOrderCount, validNextStatuses: validNextStatuses(order.status) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Reject a status change that skips steps or moves backward outside the
  // allowed graph — e.g. PENDING straight to SHIPPED, or DELIVERED back to
  // PENDING. DRAFT orders are never touched by this route at all (they only
  // move via POST .../confirm), but the check still applies defensively.
  if (parsed.data.status && !canTransitionStatus(existing.status, parsed.data.status)) {
    const next = validNextStatuses(existing.status);
    const options = next.length > 0 ? next.join(", ") : "none — this is a final status";
    return NextResponse.json(
      { error: `Cannot change status from ${existing.status} to ${parsed.data.status}. Valid next step(s): ${options}.` },
      { status: 400 }
    );
  }

  // The status leg is delegated to the shared service so this route and the
  // bulk endpoint move an order the same way — same stock, commission,
  // timeline and notification handling, written once.
  let statusResult: Awaited<ReturnType<typeof applyOrderStatusChange>> | null = null;
  if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
    statusResult = await applyOrderStatusChange(params.id, parsed.data.status, admin);
    if (!statusResult.ok) {
      return NextResponse.json({ error: statusResult.reason || "Could not change the status" }, { status: 400 });
    }
  }

  const data: any = {};
  if (parsed.data.paymentStatus !== undefined) data.paymentStatus = parsed.data.paymentStatus;
  if (parsed.data.assignedStaffId !== undefined) data.assignedStaffId = parsed.data.assignedStaffId || null;

  // --- discount / courier charge -------------------------------------------
  const changingMoney = parsed.data.discount !== undefined || parsed.data.shippingFee !== undefined;
  if (changingMoney) {
    if (PRICE_LOCKED_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: `This order is ${existing.status.toLowerCase()} — its total can no longer be changed.` },
        { status: 400 }
      );
    }
    const discount = parsed.data.discount ?? existing.discount;
    const shippingFee = parsed.data.shippingFee ?? existing.shippingFee;
    // The subtotal is the sum of the line items and is not editable here, so it
    // is the ceiling: a discount can bring an order to zero but never below,
    // and never turns into money owed back.
    if (discount > existing.subtotal + shippingFee) {
      return NextResponse.json(
        { error: `Discount can't be more than the order's ${existing.subtotal + shippingFee} BDT of items and delivery.` },
        { status: 400 }
      );
    }
    data.discount = discount;
    data.shippingFee = shippingFee;
    // Recomputed, never trusted from the client — the browser sends the two
    // inputs, the server decides what is owed.
    data.total = Math.max(0, existing.subtotal - discount + shippingFee);
  }

  const order = await prisma.order.update({ where: { id: params.id }, data });

  // One event per change, with the before and after, so the timeline explains
  // why the amount owed moved.
  if (changingMoney) {
    const parts: string[] = [];
    if (parsed.data.discount !== undefined && parsed.data.discount !== existing.discount) {
      parts.push(`discount ${existing.discount} → ${parsed.data.discount} BDT`);
    }
    if (parsed.data.shippingFee !== undefined && parsed.data.shippingFee !== existing.shippingFee) {
      parts.push(`courier charge ${existing.shippingFee} → ${parsed.data.shippingFee} BDT`);
    }
    if (parts.length > 0) {
      await logOrderEvent(
        order.id,
        "NOTE",
        `Order total updated by admin: ${parts.join(", ")}. Total ${existing.total} → ${order.total} BDT.`,
        admin.name
      );
    }
  }

  // Stock, commissions, the timeline entry and the customer notification for a
  // status change all happened inside applyOrderStatusChange above.

  if (parsed.data.paymentStatus && parsed.data.paymentStatus !== existing.paymentStatus) {
    await logOrderEvent(order.id, "PAYMENT_CHANGE", `Payment status changed from ${existing.paymentStatus} to ${parsed.data.paymentStatus}`, admin.name);
  }

  if (parsed.data.assignedStaffId !== undefined && parsed.data.assignedStaffId !== existing.assignedStaffId) {
    if (parsed.data.assignedStaffId) {
      const staffMember = await prisma.user.findUnique({ where: { id: parsed.data.assignedStaffId }, select: { name: true } });
      await logOrderEvent(order.id, "ASSIGNMENT", `Assigned to ${staffMember?.name || "a staff member"}`, admin.name);
    } else {
      await logOrderEvent(order.id, "ASSIGNMENT", "Unassigned", admin.name);
    }
  }

  // The customer notification is sent by applyOrderStatusChange, which owns
  // the whole status transition.

  return NextResponse.json({ order });
}
