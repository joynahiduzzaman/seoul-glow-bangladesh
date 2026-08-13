import { prisma } from "@/server/db";
import { adjustStock } from "@/server/inventory";
import { logOrderEvent } from "@/server/order-events";
import { notifyOrderStatusChange } from "@/server/order-notifications";
import { syncCommissionsForOrderStatus } from "@/server/commissions";
import {
  STOCK_RESTORE_STATUSES,
  canTransitionStatus,
  validNextStatuses,
  nextForwardStatus,
  forwardPathBetween,
  type OrderStatus,
} from "@/lib/order-status";

// Re-exported so existing callers keep one import site for status movement.
export { nextForwardStatus, forwardPathBetween, reachableStatuses } from "@/lib/order-status";

/**
 * The one place an order's status changes.
 *
 * Moving an order is not a field update — it moves stock, settles or voids
 * affiliate commissions, writes a timeline entry and notifies the customer, and
 * every one of those has to happen exactly once. Bulk actions made that a real
 * risk: a second implementation that forgot the stock leg, or ran it twice over
 * the same order, would silently corrupt inventory with nothing to show for it.
 *
 * So the single-order PATCH and the bulk endpoint both call this, and neither
 * knows the rules. Adding a status or changing what restocks means editing
 * src/lib/order-status.ts and nothing else.
 */
export interface StatusChangeResult {
  ok: boolean;
  orderId: string;
  orderNumber: string;
  from: string;
  to: string;
  /** Why it was refused, for the caller to report per-order. */
  reason?: string;
}

/**
 * Apply one status change, with all of its side effects.
 *
 * The read, the guard and the write happen inside a transaction that re-reads
 * the order's status and only writes if it is still what we checked — so two
 * admins hitting the same order, or the same order appearing twice in one bulk
 * request, can't both pass the guard and restock it twice. The side effects run
 * after the transaction commits: they are not rollback-safe (an email cannot be
 * unsent) and must never run for a write that didn't land.
 */
export async function applyOrderStatusChange(
  orderId: string,
  toStatus: string,
  admin: { name: string },
  /** Suppress the customer notification for this one step. Used when walking a
   *  multi-step path, so a jump from confirmed to shipped sends one message
   *  about shipping rather than one per status crossed. */
  options: { notify?: boolean } = {}
): Promise<StatusChangeResult> {
  const notify = options.notify !== false;
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existing) {
    return { ok: false, orderId, orderNumber: "", from: "", to: toStatus, reason: "Order not found" };
  }

  const base = { orderId, orderNumber: existing.orderNumber, from: existing.status, to: toStatus };

  // A draft has never had its stock deducted — that happens in
  // finalizeOrderEffects, which only the confirm route calls. Moving one to
  // PENDING through here would produce a live order holding inventory nobody
  // reserved, and the shortfall would only surface as an oversell later.
  // (The transition table does allow DRAFT -> PENDING, and the drawer's status
  // dropdown offered it, so this was already reachable before bulk actions
  // existed.) Cancelling a draft is fine: there is nothing to restock.
  if (existing.status === "DRAFT" && toStatus !== "CANCELLED") {
    return {
      ...base,
      ok: false,
      reason: "Drafts are confirmed with the Confirm button, which reserves stock",
    };
  }

  if (existing.status === toStatus) {
    return { ...base, ok: false, reason: `Already ${toStatus.toLowerCase()}` };
  }
  if (!canTransitionStatus(existing.status, toStatus)) {
    const next = validNextStatuses(existing.status);
    return {
      ...base,
      ok: false,
      reason: `Can't go ${existing.status.toLowerCase()} → ${toStatus.toLowerCase()}${
        next.length ? ` (next: ${next.join(", ").toLowerCase()})` : " — final status"
      }`,
    };
  }

  // Compare-and-set: updateMany with the expected status in the filter returns
  // count 0 if anything moved the order in the meantime, and we stop there.
  const claimed = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: existing.status },
      data: { status: toStatus },
    });
    return res.count === 1;
  });
  if (!claimed) {
    return { ...base, ok: false, reason: "Someone else changed this order first" };
  }

  // --- side effects, once, after the status is committed --------------------

  // Stock moves whenever a status crosses into or out of a "goods physically
  // came back" state. Crossing neither way (confirmed → packed) moves nothing.
  const wasRestored = STOCK_RESTORE_STATUSES.includes(existing.status as any);
  const nowRestored = STOCK_RESTORE_STATUSES.includes(toStatus as any);
  if (!wasRestored && nowRestored) {
    for (const item of existing.items) {
      await adjustStock(item.productId, item.quantity, `Order ${existing.orderNumber} ${toStatus.toLowerCase()} — stock restored`, admin.name);
    }
  } else if (wasRestored && !nowRestored) {
    for (const item of existing.items) {
      await adjustStock(item.productId, -item.quantity, `Order ${existing.orderNumber} reactivated — stock re-reserved`, admin.name);
    }
  }

  await syncCommissionsForOrderStatus(orderId, existing.status, toStatus, admin.name);
  await logOrderEvent(orderId, "STATUS_CHANGE", `Status changed from ${existing.status} to ${toStatus}`, admin.name);

  if (notify) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      const shipment = await prisma.shipment.findUnique({
        where: { orderId },
        select: { courier: true, customCourierName: true, trackingNumber: true },
      });
      // Cast: toStatus was validated against the transition table above, so by
      // here it is a real OrderStatus even though it arrived as a string.
      await notifyOrderStatusChange(order, toStatus as OrderStatus, shipment);
    }
  }

  return { ...base, ok: true };
}

/**
 * Move an order to any status further along the pipeline, crossing whatever
 * sits between.
 *
 * Fulfilment doesn't happen a step at a time. A parcel that was confirmed this
 * morning gets packed and handed to the courier in one go, and making an admin
 * pick Packed, save, then pick Shipped, save, is three round-trips to record
 * one real-world event — with a customer email fired at each one.
 *
 * Every intermediate status is still genuinely applied: each gets its own
 * timeline entry and its own stock and commission handling, because skipping
 * them would leave an order that was never packed and an audit trail that
 * can't explain itself. Only the customer notification is held back until the
 * end, so the shopper hears "your order has shipped" once rather than three
 * messages in the same second.
 *
 * Backward and sideways moves (cancel, return, refund) are single steps by
 * definition and fall through to the one-step path.
 */
export interface StatusPathResult extends StatusChangeResult {
  /** Every status crossed, in order, including the destination. */
  path: string[];
}

export async function applyOrderStatusPath(
  orderId: string,
  toStatus: string,
  admin: { name: string }
): Promise<StatusPathResult> {
  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, orderNumber: true } });
  if (!existing) {
    return { ok: false, orderId, orderNumber: "", from: "", to: toStatus, reason: "Order not found", path: [] };
  }

  const chain = forwardPathBetween(existing.status, toStatus);

  // Not a forward jump — a single legal transition, or an illegal one that the
  // single-step function will refuse with a proper explanation.
  if (chain.length <= 1) {
    const result = await applyOrderStatusChange(orderId, toStatus, admin);
    return { ...result, path: result.ok ? [toStatus] : [] };
  }

  const done: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    const isLast = i === chain.length - 1;
    const step = await applyOrderStatusChange(orderId, chain[i], admin, { notify: isLast });
    if (!step.ok) {
      // Stop where it broke rather than pressing on. The steps already applied
      // stand — they really happened — and the caller is told how far it got.
      return {
        ...step,
        from: existing.status,
        to: toStatus,
        path: done,
        reason: done.length
          ? `Moved as far as ${done[done.length - 1].toLowerCase()}, then stopped: ${step.reason}`
          : step.reason,
      };
    }
    done.push(chain[i]);
  }

  return { ok: true, orderId, orderNumber: existing.orderNumber, from: existing.status, to: toStatus, path: done };
}



