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
