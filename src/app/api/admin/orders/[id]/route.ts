import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { notifyOrderStatusChange } from "@/server/order-notifications";
import { adjustStock } from "@/server/inventory";
import { logOrderEvent } from "@/server/order-events";
import { ORDER_STATUSES, PAYMENT_STATUSES, STOCK_RESTORE_STATUSES, canTransitionStatus, validNextStatuses } from "@/lib/order-status";
import { z } from "zod";

const schema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  assignedStaffId: z.string().nullable().optional(),
});

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

  const data: any = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.paymentStatus !== undefined) data.paymentStatus = parsed.data.paymentStatus;
  if (parsed.data.assignedStaffId !== undefined) data.assignedStaffId = parsed.data.assignedStaffId || null;

  const order = await prisma.order.update({ where: { id: params.id }, data });

  // Stock moves whenever a status crosses into or out of a "goods physically
  // came back" state (cancelled or returned) — see STOCK_RESTORE_STATUSES's
  // doc comment in src/lib/order-status.ts for why REFUNDED isn't in that set.
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const wasRestored = STOCK_RESTORE_STATUSES.includes(existing.status as any);
    const nowRestored = STOCK_RESTORE_STATUSES.includes(parsed.data.status as any);
    if (!wasRestored && nowRestored) {
      for (const item of existing.items) {
        await adjustStock(item.productId, item.quantity, `Order ${order.orderNumber} ${parsed.data.status.toLowerCase()} — stock restored`, admin.name);
      }
    } else if (wasRestored && !nowRestored) {
      for (const item of existing.items) {
        await adjustStock(item.productId, -item.quantity, `Order ${order.orderNumber} reactivated — stock re-reserved`, admin.name);
      }
    }
    await logOrderEvent(order.id, "STATUS_CHANGE", `Status changed from ${existing.status} to ${parsed.data.status}`, admin.name);
  }

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

  // Notification trigger — in-app for logged-in customers, plus email (and an
  // SMS-ready stub) for guest AND registered customers alike, since a guest
  // with no account still deserves to know their order shipped.
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const shipment = await prisma.shipment.findUnique({
      where: { orderId: order.id },
      select: { courier: true, customCourierName: true, trackingNumber: true },
    });
    await notifyOrderStatusChange(order, parsed.data.status, shipment);
  }

  return NextResponse.json({ order });
}
