import { prisma } from "./db";
import { REVENUE_STATUSES, PIPELINE_STATUSES } from "@/lib/order-status";

/**
 * The single place revenue is computed.
 *
 * Three different definitions had grown up independently: the dashboard summed
 * everything except DRAFT, the orders page excluded DRAFT/CANCELLED/REFUNDED,
 * and a customer's "total spent" keyed off paymentStatus instead. They disagreed
 * with each other, and the loosest of them let a cancelled order keep counting
 * as lifetime revenue permanently.
 *
 * Every caller now goes through here, so the rule is stated once. Changing what
 * counts as earned means editing REVENUE_STATUSES in lib/order-status.ts and
 * nothing else.
 */

/** Prisma filter for orders whose value has actually been earned. */
export const revenueWhere = { status: { in: REVENUE_STATUSES } } as const;

/** Prisma filter for sold-but-not-yet-collected orders. */
export const pipelineWhere = { status: { in: PIPELINE_STATUSES } } as const;

export interface RevenueSummary {
  /** Delivered orders, all time. */
  total: number;
  /** Delivered orders within the current calendar month. */
  monthly: number;
  /** Committed but not yet delivered — shown separately, never added to total. */
  pipeline: number;
  /** How many delivered orders make up `total`. */
  orderCount: number;
}

export async function getRevenueSummary(monthStart: Date): Promise<RevenueSummary> {
  const [totalAgg, monthlyAgg, pipelineAgg, orderCount] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: revenueWhere }),
    prisma.order.aggregate({ _sum: { total: true }, where: { ...revenueWhere, createdAt: { gte: monthStart } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: pipelineWhere }),
    prisma.order.count({ where: revenueWhere }),
  ]);

  return {
    total: totalAgg._sum.total || 0,
    monthly: monthlyAgg._sum.total || 0,
    pipeline: pipelineAgg._sum.total || 0,
    orderCount,
  };
}

/**
 * Daily revenue for a chart, bucketed in JS rather than with a date-trunc query
 * so it behaves identically on every database this project supports.
 */
export async function getDailyRevenue(since: Date, days: number) {
  const orders = await prisma.order.findMany({
    where: { ...revenueWhere, createdAt: { gte: since } },
    select: { createdAt: true, total: true },
  });

  return Array.from({ length: days }).map((_, i) => {
    const day = new Date(since);
    day.setDate(day.getDate() + i);
    const key = day.toDateString();
    const total = orders
      .filter((o) => o.createdAt.toDateString() === key)
      .reduce((sum, o) => sum + o.total, 0);
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }), value: Math.round(total) };
  });
}

/**
 * Best sellers by units actually sold. Previously this grouped every OrderItem
 * regardless of status, so a cancelled order's contents kept ranking as a top
 * product — the same defect as the revenue totals, one table over.
 */
export async function getBestSellers(take = 5) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: { order: { is: revenueWhere } },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });

  const ids = rows.map((r) => r.productId);
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } } }) : [];

  return rows
    .map((r) => ({ product: products.find((p) => p.id === r.productId), qty: r._sum.quantity || 0 }))
    .filter((b): b is { product: NonNullable<typeof b.product>; qty: number } => Boolean(b.product));
}
