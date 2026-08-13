import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { applyOrderStatusChange, applyOrderStatusPath, nextForwardStatus, type StatusChangeResult } from "@/server/order-status-change";
import { ORDER_STATUSES } from "@/lib/order-status";
import { COURIERS, COURIER_LABELS } from "@/lib/shipping";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

/** One request can only ever touch this many orders. A runaway "select all"
 *  across a year of orders would otherwise hold a serverless function open
 *  through thousands of stock writes and time out halfway. */
const MAX_BULK = 100;

const schema = z
  .object({
    ids: z.array(z.string()).min(1, "Select at least one order").max(MAX_BULK, `Select ${MAX_BULK} orders or fewer at a time`),
    action: z.enum(["changeStatus", "nextStatus", "assignCourier", "assignStaff"]),
    status: z.enum(ORDER_STATUSES).optional(),
    courier: z.enum(COURIERS).optional(),
    customCourierName: z.string().max(60).optional(),
    staffId: z.string().nullable().optional(),
  })
  .refine((d) => d.action !== "changeStatus" || Boolean(d.status), { message: "Choose a status" })
  .refine((d) => d.action !== "assignCourier" || Boolean(d.courier), { message: "Choose a courier" })
  .refine((d) => d.action !== "assignCourier" || d.courier !== "CUSTOM" || Boolean(d.customCourierName?.trim()), {
    message: "Enter a name for the custom courier",
  });

/**
 * Bulk order actions.
 *
 * Every status move goes through applyOrderStatusChange — the same function the
 * single-order PATCH uses — one order at a time, sequentially. Not a
 * `updateMany`: that would skip the stock, commission, timeline and
 * notification legs entirely, and a bulk cancel would leave inventory short by
 * the whole batch with nothing recorded.
 *
 * Orders that can't make the move (wrong current status, already there, or
 * changed by someone else mid-request) are skipped and reported individually,
 * rather than failing the batch. Partial success is the honest outcome for a
 * bulk operation and the caller shows exactly which orders didn't move.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { action, status, courier, customCourierName, staffId } = parsed.data;
  // De-duplicated: the same id twice in one request must not run the side
  // effects twice, and the compare-and-set would only catch some of that.
  const ids = Array.from(new Set(parsed.data.ids));

  // ---------------------------------------------------------------- statuses
  if (action === "changeStatus" || action === "nextStatus") {
    const results: StatusChangeResult[] = [];

    if (action === "nextStatus") {
      const orders = await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, orderNumber: true } });
      for (const o of orders) {
        const to = nextForwardStatus(o.status);
        if (!to) {
          results.push({ ok: false, orderId: o.id, orderNumber: o.orderNumber, from: o.status, to: "", reason: `${o.status.toLowerCase()} has no next step` });
          continue;
        }
        results.push(await applyOrderStatusChange(o.id, to, admin));
      }
    } else {
      for (const id of ids) {
        // Path, not step: "set these twelve to Shipped" should work on an order
        // still at Confirmed, exactly as it does for a single order.
        results.push(await applyOrderStatusPath(id, status!, admin));
      }
    }

    const moved = results.filter((r) => r.ok);
    const skipped = results.filter((r) => !r.ok);
    return NextResponse.json({
      success: true,
      count: moved.length,
      skipped: skipped.length,
      // Named, so the admin can see which order didn't move and why rather than
      // a bare "3 skipped".
      details: skipped.map((s) => ({ orderNumber: s.orderNumber, reason: s.reason })),
    });
  }

  // ----------------------------------------------------------------- courier
  if (action === "assignCourier") {
    const label = courier === "CUSTOM" ? customCourierName!.trim() : COURIER_LABELS[courier!];
    let count = 0;
    const skipped: { orderNumber: string; reason: string }[] = [];

    const orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderNumber: true, status: true, shipment: { select: { id: true } } },
    });

    for (const o of orders) {
      // A courier on a cancelled or returned order is meaningless and would put
      // a live shipment against goods that aren't going anywhere.
      if (["CANCELLED", "RETURNED", "REFUNDED", "DRAFT"].includes(o.status)) {
        skipped.push({ orderNumber: o.orderNumber, reason: `${o.status.toLowerCase()} orders don't ship` });
        continue;
      }
      // upsert, so reassigning a courier on an order that already has a
      // shipment updates it rather than failing on the unique orderId.
      await prisma.shipment.upsert({
        where: { orderId: o.id },
        create: {
          orderId: o.id,
          courier: courier!,
          customCourierName: courier === "CUSTOM" ? customCourierName!.trim() : null,
          assignedById: admin.id,
        },
        update: {
          courier: courier!,
          customCourierName: courier === "CUSTOM" ? customCourierName!.trim() : null,
          assignedById: admin.id,
        },
      });
      // No tracking number is fetched here on purpose: the per-order shipment
      // route calls the courier's API for one, and doing that inside a loop of
      // up to 100 orders would be a stack of third-party calls in one request.
      // Assign in bulk, then open any order to pull its tracking number.
      await logOrderEvent(o.id, "TRACKING", `Courier set to ${label} (bulk assignment)`, admin.name);
      count++;
    }

    return NextResponse.json({ success: true, count, skipped: skipped.length, details: skipped });
  }

  // ------------------------------------------------------------------- staff
  if (action === "assignStaff") {
    const member = staffId ? await prisma.user.findUnique({ where: { id: staffId }, select: { name: true } }) : null;
    if (staffId && !member) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { assignedStaffId: staffId || null } });
    for (const id of ids) {
      await logOrderEvent(id, "ASSIGNMENT", member ? `Assigned to ${member.name} (bulk)` : "Unassigned (bulk)", admin.name);
    }
    return NextResponse.json({ success: true, count: ids.length, skipped: 0, details: [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
