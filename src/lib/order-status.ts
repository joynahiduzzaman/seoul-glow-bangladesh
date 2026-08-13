// Single source of truth for the order lifecycle — every admin UI list, every
// server-side validation, and every stock-adjustment rule reads from here so
// they can never drift out of sync with each other.
//
// Lifecycle: DRAFT -> PENDING -> CONFIRMED -> PACKED -> SHIPPED -> DELIVERED,
// with CANCELLED reachable up through PACKED (before it's left the building),
// RETURNED reachable from SHIPPED/DELIVERED (after it has), and REFUNDED as
// the financial close-out after either CANCELLED or RETURNED.

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL", "REFUNDED", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Sales channel a manually-created order came through — real, stored, filterable
// data (not a cosmetic label), so the business can see channel performance later.
export const ORDER_SOURCES = ["ONLINE", "PHONE", "MESSENGER", "WALK_IN"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

/** Every status's allowed next states. A status is always "transitionable" to
 * itself (a no-op save), which callers should treat as a non-event rather than
 * consulting this table. */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  // A cancelled order can be reactivated (customer calls back) or, if it had
  // already been paid for upfront, settled with a refund instead.
  CANCELLED: ["PENDING", "REFUNDED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

export function validNextStatuses(from: string): OrderStatus[] {
  return STATUS_TRANSITIONS[from as OrderStatus] || [];
}

export function canTransitionStatus(from: string, to: string): boolean {
  if (from === to) return true;
  return validNextStatuses(from).includes(to as OrderStatus);
}

/** Statuses where the physical goods count as "in flight" — reserved against
 * available-to-sell stock even though it's already been decremented from the
 * product's raw stock count. DRAFT is deliberately excluded: nothing has been
 * decremented for it yet, so it reserves nothing. */
export const RESERVED_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED"];

/** Statuses where inventory physically comes back — entering one of these
 * restores stock; leaving one back to an active status (the CANCELLED ->
 * PENDING reactivation) re-reserves it. REFUNDED is deliberately excluded even
 * though it's reachable from both: by the time an order gets there, whichever
 * of CANCELLED/RETURNED it passed through already did the restock. */
export const STOCK_RESTORE_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

/**
 * Revenue recognition. Money is only earned once the goods are delivered.
 *
 * This store is Cash on Delivery, so nothing is actually collected until the
 * courier hands the parcel over: an order sitting at PENDING or SHIPPED is a
 * expectation, not income, and one at CANCELLED, RETURNED or REFUNDED is not
 * income at all. Counting anything else lets a cancelled order keep inflating
 * lifetime revenue forever, which is what it did.
 *
 * Kept beside RESERVED_STATUSES and STOCK_RESTORE_STATUSES on purpose — every
 * rule that depends on where an order sits in its lifecycle lives in this one
 * file, so a new status cannot be added without confronting all of them.
 */
export const REVENUE_STATUSES: OrderStatus[] = ["DELIVERED"];

/**
 * Sold but not yet collected — real commitments worth seeing on a dashboard,
 * reported separately so they are never mistaken for earnings. DRAFT is absent
 * (never confirmed), as are the three terminal non-sale states.
 */
export const PIPELINE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED"];

/** True when an order's value counts toward realised revenue. */
export function countsAsRevenue(status: string): boolean {
  return REVENUE_STATUSES.includes(status as OrderStatus);
}

/** Customer-facing notification copy — statuses with no entry (DRAFT, REFUNDED
 * handled separately, or anything not customer-relevant) simply don't notify. */
export const STATUS_CUSTOMER_MESSAGES: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "has been confirmed",
  PACKED: "has been packed and is ready to ship",
  SHIPPED: "has shipped",
  DELIVERED: "has been delivered",
  CANCELLED: "has been cancelled",
  RETURNED: "has been marked as returned",
  REFUNDED: "has been refunded",
};

/**
 * The forward pipeline: the status an order advances to when it moves along.
 *
 * Deliberately not derived from STATUS_TRANSITIONS. Every status there also
 * lists CANCELLED or RETURNED as legal, so anything that picked "the next
 * available transition" could cancel an order while trying to advance it.
 *
 * DRAFT is absent: confirming a draft reserves stock, which only the confirm
 * route does, so a draft must never be advanced by a status change.
 *
 * These live here rather than beside the server-side transition code because
 * the admin's status dropdown needs them too, and that runs in the browser —
 * importing the server module would drag Prisma into the client bundle.
 */
const FORWARD_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export function nextForwardStatus(from: string): OrderStatus | null {
  return FORWARD_STEP[from as OrderStatus] ?? null;
}

/**
 * The statuses to cross, in order, to get from one status to another going
 * forward — empty if `to` isn't ahead of `from` on the line.
 *
 * Walking FORWARD_STEP rather than searching the transition graph means the
 * result can only ever be pipeline order, and can never route through a
 * terminal status.
 */
export function forwardPathBetween(from: string, to: string): OrderStatus[] {
  if (from === to) return [];
  const path: OrderStatus[] = [];
  let cur: OrderStatus | null = from as OrderStatus;
  // Bounded by the pipeline's length; the cap is belt and braces against a
  // future cycle in the table.
  for (let i = 0; i < 10 && cur; i++) {
    cur = nextForwardStatus(cur);
    if (!cur) break;
    path.push(cur);
    if (cur === to) return path;
  }
  return [];
}

/** Everywhere an admin can send an order from here: the whole forward
 *  pipeline, plus the terminal actions the transition table allows. */
export function reachableStatuses(from: string): OrderStatus[] {
  const forward: OrderStatus[] = [];
  let cur: OrderStatus | null = from as OrderStatus;
  for (let i = 0; i < 10 && cur; i++) {
    cur = nextForwardStatus(cur);
    if (!cur) break;
    forward.push(cur);
  }
  return Array.from(new Set([...forward, ...validNextStatuses(from)]));
}
