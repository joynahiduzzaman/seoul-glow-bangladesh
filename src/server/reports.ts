import { prisma } from "@/server/db";
import { parseOrderFilters, orderWhere, type OrderFilterParams, type ParsedOrderFilters } from "@/server/order-filters";
import { REVENUE_STATUSES } from "@/lib/order-status";

/**
 * Every figure the reports page shows, and every row its exports write.
 *
 * One module because the screen and the file must agree. An export that
 * recomputed its own totals — or quietly covered the current page instead of
 * the whole filtered set — is the classic reporting bug, and it is invisible
 * until someone reconciles a spreadsheet against the dashboard and finds they
 * disagree.
 */
export interface ReportFilterParams extends OrderFilterParams {
  productId?: string;
  categoryId?: string;
  brandId?: string;
}

export interface ParsedReportFilters extends ParsedOrderFilters {
  productId: string;
  categoryId: string;
  brandId: string;
}

export function parseReportFilters(sp: ReportFilterParams): ParsedReportFilters {
  const base = parseOrderFilters(sp);
  const productId = sp.productId?.trim() || "";
  const categoryId = sp.categoryId?.trim() || "";
  const brandId = sp.brandId?.trim() || "";
  return {
    ...base,
    productId,
    categoryId,
    brandId,
    active: base.active || Boolean(productId || categoryId || brandId),
  };
}

/**
 * Orders matching the filters.
 *
 * The product/category/brand filters are a `some` on the order's items: an
 * order counts if it contains at least one matching line. That means an order's
 * *total* can't be attributed to one product — so the summary reports order
 * counts and totals for orders containing that product, while the per-product,
 * per-category and per-brand breakdowns below work from line items, which do
 * attribute cleanly. Two different questions, answered separately rather than
 * one number pretending to answer both.
 */
export function reportWhere(f: ParsedReportFilters): Record<string, any> {
  const where = orderWhere(f);
  const itemFilter: Record<string, any> = {};
  if (f.productId) itemFilter.productId = f.productId;
  if (f.categoryId) itemFilter.product = { ...(itemFilter.product || {}), categoryId: f.categoryId };
  if (f.brandId) itemFilter.product = { ...(itemFilter.product || {}), brandId: f.brandId };
  if (Object.keys(itemFilter).length > 0) where.items = { some: itemFilter };
  return where;
}

/** Line items belonging to the filtered orders, narrowed to the chosen
 *  product/category/brand — the basis for every breakdown. */
function itemWhere(f: ParsedReportFilters): Record<string, any> {
  const where: Record<string, any> = { order: { is: reportWhere(f) } };
  if (f.productId) where.productId = f.productId;
  if (f.categoryId || f.brandId) {
    where.product = {};
    if (f.categoryId) where.product.categoryId = f.categoryId;
    if (f.brandId) where.product.brandId = f.brandId;
  }
  return where;
}

export interface SalesSummary {
  orders: number;
  units: number;
  gross: number;
  discount: number;
  shipping: number;
  net: number;
  averageOrder: number;
  deliveredOrders: number;
  deliveredNet: number;
}

export async function getSalesSummary(f: ParsedReportFilters): Promise<SalesSummary> {
  const where = reportWhere(f);
  const [agg, unitAgg, deliveredAgg] = await Promise.all([
    prisma.order.aggregate({ where, _count: true, _sum: { subtotal: true, discount: true, shippingFee: true, total: true } }),
    prisma.orderItem.aggregate({ where: itemWhere(f), _sum: { quantity: true } }),
    prisma.order.aggregate({
      where: { ...where, status: { in: REVENUE_STATUSES } },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const orders = agg._count || 0;
  const net = agg._sum.total || 0;
  return {
    orders,
    units: unitAgg._sum.quantity || 0,
    gross: agg._sum.subtotal || 0,
    discount: agg._sum.discount || 0,
    shipping: agg._sum.shippingFee || 0,
    net,
    averageOrder: orders > 0 ? Math.round(net / orders) : 0,
    // Reported separately, never folded into `net`: this shop is cash on
    // delivery, so only a delivered order is money actually collected.
    deliveredOrders: deliveredAgg._count || 0,
    deliveredNet: deliveredAgg._sum.total || 0,
  };
}

export interface DayRow { date: string; orders: number; total: number }

/** Bucketed in JS rather than with a date-trunc query, so it behaves the same
 *  on every database this project supports. */
export async function getSalesByDay(f: ParsedReportFilters): Promise<DayRow[]> {
  const orders = await prisma.order.findMany({
    where: reportWhere(f),
    select: { createdAt: true, total: true },
    orderBy: { createdAt: "asc" },
  });
  const byDay = new Map<string, { orders: number; total: number }>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) || { orders: 0, total: 0 };
    cur.orders++;
    cur.total += o.total;
    byDay.set(key, cur);
  }
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface BreakdownRow { id: string; label: string; sublabel?: string; units: number; total: number; orders: number }

/** Product, category and brand breakdowns all group the same line items by a
 *  different key, so they share one query and one shape. */
async function breakdown(f: ParsedReportFilters, by: "product" | "category" | "brand"): Promise<BreakdownRow[]> {
  const items = await prisma.orderItem.findMany({
    where: itemWhere(f),
    select: {
      orderId: true,
      quantity: true,
      price: true,
      productId: true,
      product: {
        select: {
          name: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      },
    },
  });

  const groups = new Map<string, { label: string; sublabel?: string; units: number; total: number; orderIds: Set<string> }>();
  for (const it of items) {
    let key: string;
    let label: string;
    let sublabel: string | undefined;
    if (by === "product") {
      key = it.productId;
      label = it.product?.name || "(deleted product)";
      sublabel = it.product?.brand?.name;
    } else if (by === "category") {
      key = it.product?.category?.id || "none";
      label = it.product?.category?.name || "(uncategorised)";
    } else {
      key = it.product?.brand?.id || "none";
      label = it.product?.brand?.name || "(no brand)";
    }
    const g = groups.get(key) || { label, sublabel, units: 0, total: 0, orderIds: new Set<string>() };
    g.units += it.quantity;
    // The line's own value — never the order total, which would be counted once
    // per line and inflate every multi-item order.
    g.total += it.price * it.quantity;
    g.orderIds.add(it.orderId);
    groups.set(key, g);
  }

  return Array.from(groups.entries())
    .map(([id, g]) => ({ id, label: g.label, sublabel: g.sublabel, units: g.units, total: g.total, orders: g.orderIds.size }))
    .sort((a, b) => b.total - a.total);
}

export const getProductSales = (f: ParsedReportFilters) => breakdown(f, "product");
export const getCategorySales = (f: ParsedReportFilters) => breakdown(f, "category");
export const getBrandSales = (f: ParsedReportFilters) => breakdown(f, "brand");

/** Grouped on the order rather than its lines — one row per order, so these
 *  totals do sum to the summary's net. */
async function orderGrouping(f: ParsedReportFilters, key: "paymentMethod" | "source"): Promise<BreakdownRow[]> {
  const rows = await prisma.order.groupBy({
    by: [key],
    where: reportWhere(f),
    _count: true,
    _sum: { total: true },
  });
  return rows
    .map((r) => ({
      id: String(r[key]),
      label: String(r[key]),
      units: 0,
      orders: r._count || 0,
      total: r._sum.total || 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export const getPaymentMethodSales = (f: ParsedReportFilters) => orderGrouping(f, "paymentMethod");
export const getSourceSales = (f: ParsedReportFilters) => orderGrouping(f, "source");

export interface FullReport {
  summary: SalesSummary;
  byDay: DayRow[];
  products: BreakdownRow[];
  categories: BreakdownRow[];
  brands: BreakdownRow[];
  payments: BreakdownRow[];
  sources: BreakdownRow[];
}

/**
 * Everything at once, for the page and for every export format.
 *
 * No pagination anywhere in here: an export is expected to contain the whole
 * filtered set, and the page shows the same numbers it does.
 */
export async function getFullReport(f: ParsedReportFilters): Promise<FullReport> {
  const [summary, byDay, products, categories, brands, payments, sources] = await Promise.all([
    getSalesSummary(f),
    getSalesByDay(f),
    getProductSales(f),
    getCategorySales(f),
    getBrandSales(f),
    getPaymentMethodSales(f),
    getSourceSales(f),
  ]);
  return { summary, byDay, products, categories, brands, payments, sources };
}

/** Every order in the filtered set, for the row-level export. */
export async function getReportOrders(f: ParsedReportFilters) {
  return prisma.order.findMany({
    where: reportWhere(f),
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { name: true, quantity: true, price: true } },
      user: { select: { name: true, email: true } },
      shipment: { select: { courier: true, customCourierName: true, trackingNumber: true } },
    },
  });
}
