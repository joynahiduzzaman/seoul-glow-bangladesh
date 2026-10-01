/**
 * What the shop spends money on, and — critically — which of those amounts may
 * be subtracted from profit.
 *
 * ## Why a category needs an `operating` flag
 *
 * Buying stock is not an expense on the day you buy it. It converts cash into
 * inventory; the cost only becomes an expense when that specific item sells,
 * at which point it is already counted as Cost of Goods Sold (COGS), derived
 * from the per-unit cost snapshot on each order line.
 *
 * So if a ৳50,000 wholesale shipment were also recorded here as an operating
 * expense, every unit in it would be charged against profit twice: once as
 * COGS when it sells, and once more as a lump sum on the day it arrived. Net
 * profit would read far lower than reality, and would swing wildly in whichever
 * month a restock happened to land.
 *
 * `operating: false` keeps such a row out of the profit calculation while still
 * recording it, because the owner genuinely needs to see that cash left the
 * business. It surfaces in the cash-out view instead of the P&L.
 */

export interface ExpenseCategory {
  value: string;
  label: string;
  /** One-line explanation shown in the picker, so the right category is obvious. */
  hint: string;
  /**
   * Whether this amount is subtracted from gross profit.
   *
   * False only for money that buys an asset the business still holds (stock),
   * where COGS already accounts for the cost as it sells. See the note above.
   */
  operating: boolean;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    value: "INVENTORY",
    label: "Stock purchase",
    hint: "Wholesale buying — excluded from profit, since cost of goods already counts it as each item sells",
    operating: false,
  },
  {
    value: "SHIPPING",
    label: "Courier & delivery",
    hint: "Steadfast, Pathao, RedX, Paperfly bills",
    operating: true,
  },
  {
    value: "MARKETING",
    label: "Ads & marketing",
    hint: "Facebook and Instagram boosts, influencers, giveaways",
    operating: true,
  },
  {
    value: "PACKAGING",
    label: "Packaging & supplies",
    hint: "Boxes, bubble wrap, tape, thank-you cards",
    operating: true,
  },
  {
    value: "SALARY",
    label: "Salary & wages",
    hint: "Staff pay, bonuses, freelancer payments",
    operating: true,
  },
  {
    value: "RENT",
    label: "Rent & utilities",
    hint: "Shop or storeroom rent, electricity, internet",
    operating: true,
  },
  {
    value: "TRANSPORT",
    label: "Transport & travel",
    hint: "Rickshaw, CNG, fuel, trips to collect stock",
    operating: true,
  },
  {
    value: "FEES",
    label: "Fees & software",
    hint: "Payment gateway charges, bank fees, hosting, subscriptions",
    operating: true,
  },
  {
    value: "REFUND",
    label: "Refunds & damages",
    hint: "Money returned to customers, broken or lost stock written off",
    operating: true,
  },
  {
    value: "OTHER",
    label: "Other",
    hint: "Anything that doesn't fit the categories above",
    operating: true,
  },
];

const BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c]));

/** Valid category values, for zod validation on the API. */
export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

/** The categories that reduce profit — the P&L reads this, never a hardcoded list. */
export const OPERATING_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => c.operating).map((c) => c.value);

/** Categories that buy an asset rather than consuming value (currently just stock). */
export const NON_OPERATING_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => !c.operating).map((c) => c.value);

export function expenseCategory(value: string): ExpenseCategory | undefined {
  return BY_VALUE.get(value);
}

/**
 * Display label for a stored value. Falls back to the raw string rather than
 * rendering nothing, so a category removed from this file in future still shows
 * something recognisable on historical rows instead of a blank cell.
 */
export function expenseCategoryLabel(value: string): string {
  return BY_VALUE.get(value)?.label ?? value;
}

/** Whether a stored category counts against profit. Unknown values are treated
 *  as operating: a spend we can't classify is still money gone, and silently
 *  dropping it from the P&L would overstate profit. */
export function isOperatingCategory(value: string): boolean {
  return BY_VALUE.get(value)?.operating ?? true;
}

/** How the expense was paid. Mirrors the payment methods used on orders plus the
 *  ways a shop pays its own bills. */
export const EXPENSE_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export const EXPENSE_PAYMENT_VALUES = EXPENSE_PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]];

export function expensePaymentLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return EXPENSE_PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

/**
 * Reads the date an expense was spent, from either a date-only value out of a
 * `<input type="date">` ("2026-10-01") or a full ISO timestamp.
 *
 * Date-only strings are deliberately NOT handed to `new Date(value)`: that
 * parses them as UTC midnight, and for any timezone behind UTC the result lands
 * on the previous calendar day — silently filing a bill into the wrong month and
 * quietly corrupting every monthly profit figure that follows. Building the date
 * from its parts keeps it local, and noon avoids any DST edge landing it on a
 * neighbouring day.
 *
 * Returns null for anything unparseable so the caller can reject it rather than
 * storing an Invalid Date.
 */
export function parseSpentAt(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const built = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(built.getTime()) ? null : built;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
