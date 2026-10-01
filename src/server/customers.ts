import { prisma } from "./db";
import { revenueWhere } from "./revenue";
import { computeProfit } from "./finance";
import { normalizePhone } from "@/lib/utils";

/**
 * Who actually buys from this shop.
 *
 * Built on ORDERS, not on registered accounts, because at the time of writing
 * 13 of 17 orders were guest checkouts: an account-based view showed seven
 * registered users with zero orders between them, while eleven real people had
 * bought and two had come back. Most of this shop's customers never make an
 * account, so "customer" has to mean "someone who ordered".
 *
 * Identity is the account where there is one, and the normalised shipping phone
 * otherwise. Phone is the only thing a guest re-supplies on a return visit —
 * names are typed differently each time ("munni " vs "Munni") and email is often
 * absent — and normalizePhone() collapses +8801…, 01… and 1… to one key, the
 * same rule the public Track Order page matches on. Account takes priority
 * because a buyer who ships to a friend's address is still one buyer; keying
 * everyone on the delivery number split such a customer into one row per
 * address they had ever sent to.
 *
 * Spend and profit count DELIVERED orders only, through the shared revenueWhere,
 * so a cancelled order can never inflate someone's standing.
 */

export type CustomerSort = "profit" | "spend" | "orders" | "recent" | "name";

export interface CustomerRow {
  /** Normalised phone, or a synthetic key when an order somehow has none. */
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** True when these orders are attached to a registered account. */
  hasAccount: boolean;
  orderCount: number;
  spend: number;
  profit: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  /** Units bought whose cost is unknown, so `profit` reads high for this row. */
  unitsMissingCost: number;
}

export interface CustomerListResult {
  rows: CustomerRow[];
  total: number;
  totals: {
    buyers: number;
    repeatBuyers: number;
    spend: number;
    profit: number;
    registeredAccounts: number;
  };
}

export const CUSTOMERS_PAGE_SIZE = 20;

/**
 * Every buyer, ranked.
 *
 * One pass over delivered orders rather than a groupBy: the profit figure needs
 * each order's line costs anyway, so the rows have to be in memory regardless,
 * and grouping in JS keeps the phone-normalising rule in one place instead of
 * trying to express it in SQL. This shop has tens of orders; if it ever has
 * hundreds of thousands, this becomes a materialised summary rather than a
 * cleverer query.
 */
export async function listCustomers(opts: {
  q?: string;
  sort?: CustomerSort;
  page?: number;
}): Promise<CustomerListResult> {
  const q = opts.q?.trim().toLowerCase() || "";
  const sort: CustomerSort = opts.sort || "profit";
  const page = Math.max(1, opts.page || 1);

  const [orders, registeredAccounts] = await Promise.all([
    prisma.order.findMany({
      where: revenueWhere,
      select: {
        id: true,
        createdAt: true,
        total: true,
        discount: true,
        shippingFee: true,
        shippingName: true,
        shippingPhone: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        userId: true,
        user: { select: { name: true, email: true, phone: true } },
        items: {
          select: { price: true, quantity: true, costPrice: true, product: { select: { costPrice: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  type Bucket = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    hasAccount: boolean;
    orders: typeof orders;
    first: Date;
    last: Date;
  };
  const buckets = new Map<string, Bucket>();

  for (const o of orders) {
    const rawPhone = o.shippingPhone || o.guestPhone || o.user?.phone || "";
    // A registered buyer is keyed by their account, not by the phone on the
    // parcel: someone who ships to a friend's address and phone is still one
    // customer, and keying on the delivery number split them into a new "person"
    // for every address they ever sent to. Guests have no account to key on, so
    // they fall back to the normalised phone, which is the only identity a guest
    // checkout re-supplies on a return visit.
    const key = o.userId ? `user:${o.userId}` : normalizePhone(rawPhone) || `order:${o.id}`;
    const name = o.user?.name || o.shippingName || o.guestName || "Unknown";
    const email = o.user?.email || o.guestEmail || null;

    const existing = buckets.get(key);
    if (existing) {
      existing.orders.push(o);
      // Latest order wins the display name and email: people correct their own
      // details over time, and the most recent spelling is the current one.
      existing.name = name;
      if (email) existing.email = email;
      existing.hasAccount = existing.hasAccount || Boolean(o.userId);
      if (o.createdAt < existing.first) existing.first = o.createdAt;
      if (o.createdAt > existing.last) existing.last = o.createdAt;
    } else {
      buckets.set(key, {
        id: key,
        name,
        phone: rawPhone || null,
        email,
        hasAccount: Boolean(o.userId),
        orders: [o],
        first: o.createdAt,
        last: o.createdAt,
      });
    }
  }

  let rows: CustomerRow[] = [...buckets.values()].map((b) => {
    const summary = computeProfit(
      b.orders.map((o) => ({
        total: o.total,
        discount: o.discount,
        shippingFee: o.shippingFee,
        items: o.items.map((i) => ({
          price: i.price,
          quantity: i.quantity,
          costPrice: i.costPrice ?? i.product?.costPrice ?? null,
        })),
      })),
      // No expenses: a courier bill or an ad campaign belongs to the shop, not
      // to one buyer. This is their gross contribution.
      []
    );
    return {
      id: b.id,
      name: b.name,
      phone: b.phone,
      email: b.email,
      hasAccount: b.hasAccount,
      orderCount: b.orders.length,
      spend: summary.netRevenue,
      profit: summary.grossProfit,
      lastOrderAt: b.last.toISOString(),
      firstOrderAt: b.first.toISOString(),
      unitsMissingCost: summary.unitsMissingCost,
    };
  });

  const totals = {
    buyers: rows.length,
    repeatBuyers: rows.filter((r) => r.orderCount > 1).length,
    spend: rows.reduce((s, r) => s + r.spend, 0),
    profit: rows.reduce((s, r) => s + r.profit, 0),
    registeredAccounts,
  };

  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.phone ? normalizePhone(r.phone).includes(normalizePhone(q) || q) : false)
    );
  }

  rows.sort((a, b) => {
    switch (sort) {
      case "spend":
        return b.spend - a.spend;
      case "orders":
        return b.orderCount - a.orderCount || b.spend - a.spend;
      case "recent":
        return (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "");
      case "name":
        return a.name.localeCompare(b.name);
      case "profit":
      default:
        return b.profit - a.profit;
    }
  });

  const total = rows.length;
  return {
    rows: rows.slice((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE),
    total,
    totals,
  };
}
