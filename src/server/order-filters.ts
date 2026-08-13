import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";
import { COURIERS } from "@/lib/shipping";
import { ORDER_SOURCES } from "@/lib/order-status";

/**
 * One definition of "which orders is the admin looking at".
 *
 * The orders list and the reports page ask the same question with the same
 * words, and an export that quietly covered a different set than the screen it
 * came from would be worse than no export at all — so the URL parsing and the
 * Prisma filter are built here once and both read from it.
 */
export interface OrderFilterParams {
  q?: string;
  status?: string;
  payment?: string;
  courier?: string;
  source?: string;
  from?: string;
  to?: string;
}

export interface ParsedOrderFilters {
  q: string;
  status: string;
  payment: string;
  courier: string;
  source: string;
  from: string;
  to: string;
  /** True when anything is narrowing the view — drives "Clear filters". */
  active: boolean;
}

const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Accepts only values the app actually knows, so a hand-typed query string
 *  can't produce a filter that silently matches nothing. */
export function parseOrderFilters(sp: OrderFilterParams): ParsedOrderFilters {
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "";
  const payment = sp.payment && (PAYMENT_STATUSES as readonly string[]).includes(sp.payment) ? sp.payment : "";
  const courier = sp.courier && ((COURIERS as readonly string[]).includes(sp.courier) || sp.courier === "NONE") ? sp.courier : "";
  const source = sp.source && (ORDER_SOURCES as readonly string[]).includes(sp.source) ? sp.source : "";
  const from = sp.from && isValidDate(sp.from) ? sp.from : "";
  const to = sp.to && isValidDate(sp.to) ? sp.to : "";
  const q = sp.q?.trim() || "";

  return { q, status, payment, courier, source, from, to, active: Boolean(q || status || payment || courier || source || from || to) };
}

/** The end of a calendar day, so a `to` date includes everything that happened
 *  on it — an exclusive midnight bound silently drops a whole day of orders. */
export function endOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function orderWhere(f: ParsedOrderFilters): Record<string, any> {
  const where: any = {};
  if (f.status) where.status = f.status;
  if (f.payment) where.paymentStatus = f.payment;
  if (f.source) where.source = f.source;

  if (f.courier === "NONE") {
    // "Awaiting courier" — a real working queue, not an absence of data.
    where.shipment = { is: null };
  } else if (f.courier) {
    where.shipment = { is: { courier: f.courier } };
  }

  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(f.from);
    if (f.to) where.createdAt.lte = endOfDay(f.to);
  }

  if (f.q) {
    where.OR = [
      { orderNumber: { contains: f.q, mode: "insensitive" } },
      { shippingName: { contains: f.q, mode: "insensitive" } },
      { shippingPhone: { contains: f.q, mode: "insensitive" } },
      { guestEmail: { contains: f.q, mode: "insensitive" } },
      { guestName: { contains: f.q, mode: "insensitive" } },
      { user: { email: { contains: f.q, mode: "insensitive" } } },
      { user: { name: { contains: f.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

/** Rebuild the querystring with some values replaced — used by every filter
 *  control and by pagination, so changing a filter never loses the others. */
export function buildOrderQuery(
  base: ParsedOrderFilters & { sort?: string },
  overrides: Record<string, string | undefined>,
  path = "/admin/orders"
): string {
  const merged: Record<string, string | undefined> = {
    q: base.q,
    status: base.status,
    payment: base.payment,
    courier: base.courier,
    source: base.source,
    from: base.from,
    to: base.to,
    sort: base.sort,
    ...overrides,
  };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && !(k === "sort" && v === "newest")) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
