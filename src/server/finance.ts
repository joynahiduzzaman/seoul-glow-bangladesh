import { prisma } from "./db";
import { revenueWhere } from "./revenue";
import { isOperatingCategory } from "@/lib/expense-categories";

/**
 * The single place profit is computed.
 *
 * `server/revenue.ts` answers "how much came in". This answers "how much did we
 * keep", which needs two things revenue alone never had: what the goods cost,
 * and what the shop spent running itself.
 *
 *   Net revenue      sum of DELIVERED order totals (after discounts, incl. delivery)
 *   − COGS           per-unit cost snapshot x quantity, on those same orders
 *   = Gross profit
 *   − Operating expenses   every Expense row in range whose category is operating
 *   = Net profit
 *
 * It reuses `revenueWhere` deliberately, so profit can never be calculated over
 * a different set of orders than revenue is. If what counts as earned changes,
 * it changes in one place (REVENUE_STATUSES) and both follow.
 *
 * Stock purchases are excluded from operating expenses on purpose — see the
 * long note in lib/expense-categories.ts for why counting them would charge the
 * same taka twice.
 */

export interface ProfitInputOrder {
  total: number;
  discount: number;
  shippingFee: number;
  items: { price: number; quantity: number; costPrice: number | null }[];
}

export interface ProfitInputExpense {
  category: string;
  amount: number;
}

export interface ProfitSummary {
  /** Line-item value before order-level discounts and delivery. */
  grossSales: number;
  discounts: number;
  shippingCollected: number;
  /** What the customer actually paid, summed. The headline "revenue". */
  netRevenue: number;
  /** Cost of the goods in those orders. */
  cogs: number;
  grossProfit: number;
  /** Expenses that reduce profit. */
  operatingExpenses: number;
  /** Stock purchases etc. — real cash out, but not a P&L line. */
  nonOperatingSpend: number;
  netProfit: number;
  /** Gross profit as a percentage of net revenue. 0 when there is no revenue. */
  grossMargin: number;
  /** Net profit as a percentage of net revenue. 0 when there is no revenue. */
  netMargin: number;
  orderCount: number;
  unitsSold: number;
  /**
   * Units whose cost is unknown — no snapshot and no current product cost.
   * Non-zero means COGS is understated and profit overstated, so the UI says so
   * rather than presenting a confident wrong number.
   */
  unitsMissingCost: number;
  averageOrderValue: number;
  /** Average profit per order, after operating expenses are shared across them. */
  profitPerOrder: number;
}

/**
 * Pure P&L arithmetic — no database, no dates, no Prisma types.
 *
 * Split out from the queries below so the maths is directly testable: the
 * fixtures in server/__tests__/finance.test.ts exercise discounting, missing
 * costs, loss-making months and the double-count guard without needing a
 * database to exist.
 */
export function computeProfit(orders: ProfitInputOrder[], expenses: ProfitInputExpense[]): ProfitSummary {
  let grossSales = 0;
  let discounts = 0;
  let shippingCollected = 0;
  let netRevenue = 0;
  let cogs = 0;
  let unitsSold = 0;
  let unitsMissingCost = 0;

  for (const order of orders) {
    netRevenue += order.total;
    discounts += order.discount;
    shippingCollected += order.shippingFee;
    for (const item of order.items) {
      grossSales += item.price * item.quantity;
      unitsSold += item.quantity;
      if (item.costPrice == null) {
        unitsMissingCost += item.quantity;
      } else {
        cogs += item.costPrice * item.quantity;
      }
    }
  }

  let operatingExpenses = 0;
  let nonOperatingSpend = 0;
  for (const expense of expenses) {
    if (isOperatingCategory(expense.category)) operatingExpenses += expense.amount;
    else nonOperatingSpend += expense.amount;
  }

  const grossProfit = netRevenue - cogs;
  const netProfit = grossProfit - operatingExpenses;
  const orderCount = orders.length;

  // Guarded rather than computed blind: a range with no sales must report 0%,
  // not NaN or Infinity, because these values are rendered straight into cards.
  const pct = (part: number) => (netRevenue > 0 ? (part / netRevenue) * 100 : 0);

  return {
    grossSales,
    discounts,
    shippingCollected,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    nonOperatingSpend,
    netProfit,
    grossMargin: pct(grossProfit),
    netMargin: pct(netProfit),
    orderCount,
    unitsSold,
    unitsMissingCost,
    averageOrderValue: orderCount > 0 ? netRevenue / orderCount : 0,
    profitPerOrder: orderCount > 0 ? netProfit / orderCount : 0,
  };
}

/**
 * The reporting periods the dashboard and the expenses page both offer.
 *
 * Shared so the two pages can never disagree about what "this month" means —
 * an owner comparing the dashboard's net profit against the expenses page's
 * total has to be looking at the same window for the numbers to reconcile.
 */
export const PERIODS = [
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "30d", label: "Last 30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] as const;

export type PeriodValue = (typeof PERIODS)[number]["value"];

export interface ResolvedPeriod {
  value: PeriodValue;
  label: string;
  from: Date;
  to: Date;
}

/** Turns a period key from the query string into real dates. Anything
 *  unrecognised falls back to the current month rather than erroring. */
export function resolvePeriod(value: string | undefined, now = new Date()): ResolvedPeriod {
  const key = (PERIODS.find((p) => p.value === value)?.value ?? "month") as PeriodValue;
  const label = PERIODS.find((p) => p.value === key)!.label;

  switch (key) {
    case "last-month": {
      const from = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      return { value: key, label, from, to: endOfMonth(from) };
    }
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { value: key, label, from, to: now };
    }
    case "year":
      return { value: key, label, from: new Date(now.getFullYear(), 0, 1), to: now };
    case "all":
      // 2020 predates the shop by years, so this is "everything" without needing
      // a query to find the first order.
      return { value: key, label, from: new Date(2020, 0, 1), to: now };
    case "month":
    default:
      return { value: "month", label, from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/** Inclusive day bounds, so "1st to 31st" includes everything that happened on
 *  the 31st rather than stopping at its first millisecond. */
export function dayRange(from: Date, to: Date) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * The cost to use for one sold unit.
 *
 * Prefers the snapshot taken when the order was placed. Falls back to the
 * product's current cost only when there is no snapshot (orders predating the
 * column, if the backfill could not reach them) — approximate, but far closer
 * than treating the item as free. Returns null when neither exists, which the
 * summary counts in `unitsMissingCost` rather than silently assuming zero.
 */
function resolveUnitCost(itemCost: number | null, productCost: number | null | undefined): number | null {
  if (itemCost != null) return itemCost;
  if (productCost != null) return productCost;
  return null;
}

async function loadOrders(start: Date, end: Date) {
  const orders = await prisma.order.findMany({
    where: { ...revenueWhere, createdAt: { gte: start, lte: end } },
    select: {
      total: true,
      discount: true,
      shippingFee: true,
      createdAt: true,
      items: {
        select: {
          price: true,
          quantity: true,
          costPrice: true,
          product: { select: { costPrice: true } },
        },
      },
    },
  });

  return orders.map((o) => ({
    total: o.total,
    discount: o.discount,
    shippingFee: o.shippingFee,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      costPrice: resolveUnitCost(i.costPrice, i.product?.costPrice),
    })),
  }));
}

async function loadExpenses(start: Date, end: Date) {
  return prisma.expense.findMany({
    where: { spentAt: { gte: start, lte: end } },
    select: { category: true, amount: true, spentAt: true },
  });
}

/** Full P&L for a date range. */
export async function getProfitSummary(from: Date, to: Date): Promise<ProfitSummary> {
  const { start, end } = dayRange(from, to);
  const [orders, expenses] = await Promise.all([loadOrders(start, end), loadExpenses(start, end)]);
  return computeProfit(orders, expenses);
}

export interface ExpenseBreakdownRow {
  category: string;
  total: number;
  count: number;
  operating: boolean;
}

/** Expenses grouped by category, biggest first — what the money actually went on. */
export async function getExpenseBreakdown(from: Date, to: Date): Promise<ExpenseBreakdownRow[]> {
  const { start, end } = dayRange(from, to);
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { spentAt: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: true,
  });

  return rows
    .map((r) => ({
      category: r.category,
      total: r._sum.amount || 0,
      count: r._count,
      operating: isOperatingCategory(r.category),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface DailyProfitPoint {
  date: string;
  revenue: number;
  profit: number;
}

/**
 * Revenue and profit per day across a range.
 *
 * Bucketed in JS rather than with a SQL date_trunc for the same reason
 * getDailyRevenue does it: identical behaviour on every database this project
 * supports, and no timezone surprises between the query planner and the app.
 *
 * Expenses are attributed to the day they were spent, so a single large bill
 * shows as a one-day dip rather than being smeared across the range. That is
 * the honest picture — it is what actually happened to the money that day.
 */
export async function getDailyProfit(from: Date, to: Date): Promise<DailyProfitPoint[]> {
  const { start, end } = dayRange(from, to);
  const [orders, expenses] = await Promise.all([loadOrders(start, end), loadExpenses(start, end)]);

  const days: DailyProfitPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toDateString();
    const dayOrders = orders.filter((o) => o.createdAt.toDateString() === key);
    const dayExpenses = expenses.filter((e) => e.spentAt.toDateString() === key);
    const summary = computeProfit(dayOrders, dayExpenses);
    days.push({
      date: new Date(cursor).toISOString().slice(0, 10),
      revenue: Math.round(summary.netRevenue),
      profit: Math.round(summary.netProfit),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Profit for the current month alongside the same figure for last month.
 *
 * The comparison is the point: a net profit number on its own tells an owner
 * nothing about whether the shop is improving. `change` is null when last month
 * had no revenue, because "up ∞%" from zero is not a meaningful trend.
 */
export async function getMonthOverMonth(now = new Date()) {
  const thisStart = startOfMonth(now);
  const thisEnd = endOfMonth(now);
  const lastStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastEnd = endOfMonth(lastStart);

  const [current, previous] = await Promise.all([
    getProfitSummary(thisStart, thisEnd),
    getProfitSummary(lastStart, lastEnd),
  ]);

  const pctChange = (now_: number, then: number): number | null => {
    if (then === 0) return null;
    return ((now_ - then) / Math.abs(then)) * 100;
  };

  return {
    current,
    previous,
    revenueChange: pctChange(current.netRevenue, previous.netRevenue),
    profitChange: pctChange(current.netProfit, previous.netProfit),
  };
}
