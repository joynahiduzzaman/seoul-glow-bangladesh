import Link from "next/link";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import StatCard from "@/components/admin/StatCard";
import NeedsAction from "@/components/admin/NeedsAction";
import SimpleBarChart from "@/components/admin/SimpleBarChart";
import { getRevenueSummary, getDailyRevenue, getBestSellers } from "@/server/revenue";
import {
  Wallet, TrendingUp, CalendarCheck, Clock, PackageSearch, CheckCircle2, XCircle,
  AlertTriangle, PackageX, Plus, ShoppingCart, Tag, LifeBuoy, Users, Package,
  CalendarClock, CalendarX,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Same 60-day window the admin Product Form's live "expiring soon" hint uses
// (see ProductForm.tsx) — one threshold, so a product never shows a different
// urgency on the form than it does on this dashboard.
const EXPIRY_SOON_DAYS = 60;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function AdminDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const expirySoonCutoff = new Date(todayStart);
  expirySoonCutoff.setDate(expirySoonCutoff.getDate() + EXPIRY_SOON_DAYS);

  const [
    todaysOrders,
    pendingOrders,
    packedOrders,
    deliveredOrders,
    cancelledOrders,
    lowStockCount,
    outOfStockCount,
    lowStock,
    recentOrders,
    latestCustomers,
    totalProducts,
    totalCustomers,
    expiredCount,
    expiringSoonCount,
    expiringSoonProducts,
    needsFulfillment,
    awaitingCourier,
    unpaidDelivered,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PACKED" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),    prisma.product.count({ where: { stock: { gt: 0, lt: 10 } } }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.product.findMany({ where: { stock: { gt: 0, lt: 10 } }, take: 6, orderBy: { stock: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { items: true, user: { select: { name: true } } } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 5 }),    prisma.product.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    // Expiry alerts — only products that still have stock to sell; an expired
    // item with 0 stock isn't an action item for anyone anymore.
    prisma.product.count({ where: { expiryDate: { lt: now }, stock: { gt: 0 } } }),
    prisma.product.count({ where: { expiryDate: { gte: now, lte: expirySoonCutoff }, stock: { gt: 0 } } }),
    prisma.product.findMany({
      where: { expiryDate: { not: null, lte: expirySoonCutoff }, stock: { gt: 0 } },
      take: 6,
      orderBy: { expiryDate: "asc" },
    }),
    // --- Needs Action -----------------------------------------------------
    // Confirmed and packed orders are the fulfilment queue: paid for, agreed,
    // and sitting in the shop waiting to be picked and boxed.
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PACKED"] } } }),
    // Ready to go but with no courier assigned — the step that quietly stalls,
    // because nothing about the order looks wrong until someone asks where it is.
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PACKED"] }, shipment: { is: null } } }),
    // Delivered but never marked paid. On cash on delivery that is money the
    // courier is holding, or money nobody chased.
    prisma.order.count({ where: { status: "DELIVERED", paymentStatus: { in: ["PENDING", "PARTIAL"] } } }),
  ]);

  // Revenue, the chart and best sellers all read the same rule from
  // server/revenue.ts, so a cancelled order cannot count in one place and not
  // another. See REVENUE_STATUSES in lib/order-status.ts for what qualifies.
  const revenue = await getRevenueSummary(monthStart);
  const totalRevenue = revenue.total;
  const monthlyRevenue = revenue.monthly;

  const chartData = await getDailyRevenue(sevenDaysAgo, 7);

  const bestSellers = await getBestSellers(5);

  const QUICK_ACTIONS = [
    { label: "Add Product", href: "/admin/products/new", icon: Plus },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { label: "Coupons", href: "/admin/coupons", icon: Tag },
    { label: "Support", href: "/admin/support-tickets", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[2rem] font-semibold tracking-tight leading-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink/70">Here&apos;s how the store is doing today.</p>
      </div>

      {/* Revenue + today headline row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Wallet} label="Total Revenue" value={formatBDT(totalRevenue)} tone="success" hint="Delivered orders, all time" />
        <StatCard icon={TrendingUp} label="Monthly Revenue" value={formatBDT(monthlyRevenue)} tone="info" hint="Delivered this calendar month" />
        {/* Clickable: the number was already the interesting part, and the
            orders list now takes a date range, so it can land on exactly the
            orders it counts. */}
        <StatCard
          icon={CalendarCheck}
          label="Today's Orders"
          value={todaysOrders}
          tone="violet"
          hint="Placed since midnight"
          href={`/admin/orders?from=${todayStart.toISOString().slice(0, 10)}&to=${todayStart.toISOString().slice(0, 10)}`}
        />
      </div>

      <NeedsAction
        items={[
          {
            label: "to fulfil",
            count: needsFulfillment,
            href: "/admin/orders?status=CONFIRMED",
            hint: "Confirmed or packed, waiting to be picked and boxed",
            icon: "fulfil",
          },
          {
            label: "awaiting a courier",
            count: awaitingCourier,
            href: "/admin/orders?courier=NONE",
            hint: "Ready to ship with no courier assigned yet",
            icon: "courier",
          },
          {
            label: "payments outstanding",
            count: unpaidDelivered,
            href: "/admin/orders?status=DELIVERED&payment=PENDING",
            hint: "Delivered but not marked paid — cash still to collect",
            icon: "payment",
          },
          {
            label: "products low or out",
            count: lowStockCount + outOfStockCount,
            href: "/admin/inventory?filter=low",
            hint: "Fewer than 10 left, or nothing at all",
            icon: "stock",
          },
        ]}
      />

      {/* Order status breakdown */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Order Status</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Clock} label="Pending" value={pendingOrders} tone="warning" href="/admin/orders?status=PENDING" />
          <StatCard icon={PackageSearch} label="Packed" value={packedOrders} tone="info" href="/admin/orders?status=PACKED" />
          <StatCard icon={CheckCircle2} label="Delivered" value={deliveredOrders} tone="success" href="/admin/orders?status=DELIVERED" />
          <StatCard icon={XCircle} label="Cancelled" value={cancelledOrders} tone="danger" href="/admin/orders?status=CANCELLED" />
        </div>
      </section>

      {/* Inventory alerts */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Inventory Alerts</h2>
        {/* Held to the same 4-column rhythm as the row above (spanning 2 each on
            desktop) so the cards line up instead of stretching to half-screen. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={AlertTriangle} label="Low Stock" value={lowStockCount} tone="warning" hint="Fewer than 10 left" href="/admin/inventory?filter=low" />
          <StatCard icon={PackageX} label="Out of Stock" value={outOfStockCount} tone="danger" hint="Needs restocking" href="/admin/inventory?filter=out" />
          <StatCard icon={Package} label="Total Products" value={totalProducts} tone="default" hint="Live in catalogue" href="/admin/products" />
          <StatCard icon={Users} label="Customers" value={totalCustomers} tone="violet" hint="Registered accounts" />
        </div>
      </section>

      {/* Expiry alerts */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Expiry Alerts</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={CalendarClock}
            label="Expiring Soon"
            value={expiringSoonCount}
            tone="warning"
            hint={`Within ${EXPIRY_SOON_DAYS} days`}
            href="/admin/inventory?filter=expiring"
          />
          <StatCard
            icon={CalendarX}
            label="Expired"
            value={expiredCount}
            tone="danger"
            hint="Still in stock — pull from sale"
            href="/admin/inventory?filter=expired"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl2 border border-border-soft/80 bg-white px-4 py-3.5 text-sm font-medium text-ink shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-0.5 hover:border-rose-gold/30 hover:shadow-e3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-gold/10 text-rose-gold transition-colors duration-300 group-hover:bg-rose-gold group-hover:text-white">
                <Icon size={16} />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Sales trend */}
      <section className="bg-white rounded-xl2 p-6 shadow-soft">
        <h2 className="font-display text-xl mb-1">Sales — Last 7 Days</h2>
        <p className="text-xs text-ink/70 mb-4">Revenue by day, most recent order data.</p>
        {chartData.some((d) => d.value > 0) ? (
          <SimpleBarChart data={chartData} />
        ) : (
          <p className="text-sm text-ink/70 py-8 text-center">No orders in the last 7 days yet.</p>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl2 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-rose-gold-text hover:underline">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState message="No orders yet — they'll show up here as customers check out." />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/admin/orders`} className="flex justify-between text-sm border-b border-ink/5 pb-3 hover:bg-beige/30 -mx-2 px-2 rounded transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-ink/70 text-xs truncate">{o.user?.name || o.guestName || "Guest"} · {o.items.length} items</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-medium">{formatBDT(o.total)}</p>
                    <StatusPill status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl2 p-6 shadow-soft">
          <h2 className="font-display text-xl mb-4">Best Selling Products</h2>
          {bestSellers.length === 0 ? (
            <EmptyState message="No sales data yet — best sellers will appear once orders come in." />
          ) : (
            <div className="space-y-3">
              {bestSellers.map(({ product, qty }) => (
                <div key={product!.id} className="flex justify-between text-sm border-b border-ink/5 pb-3">
                  <span className="truncate pr-3">{product!.name}</span>
                  <span className="text-ink/70 shrink-0">{qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl2 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Latest Customers</h2>
            <Users size={16} className="text-ink/30" />
          </div>
          {latestCustomers.length === 0 ? (
            <EmptyState message="No customers have signed up yet." />
          ) : (
            <div className="space-y-3">
              {latestCustomers.map((c) => (
                <div key={c.id} className="flex justify-between text-sm border-b border-ink/5 pb-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-ink/70 text-xs truncate">{c.email}</p>
                  </div>
                  <span className="text-ink/70 text-xs shrink-0">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl2 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Low Stock</h2>
            <Link href="/admin/inventory?filter=low" className="text-xs text-rose-gold-text hover:underline">Manage</Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState message="All products are well-stocked." />
          ) : (
            <div className="space-y-3">
              {lowStock.map((p) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-ink/5 pb-3">
                  <span className="truncate pr-3">{p.name}</span>
                  <span className="text-gold font-medium shrink-0">{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl2 p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Expiring Soon</h2>
          <Link href="/admin/inventory?filter=expiring" className="text-xs text-rose-gold-text hover:underline">Manage</Link>
        </div>
        {expiringSoonProducts.length === 0 ? (
          <EmptyState message="Nothing expiring in the next 60 days." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expiringSoonProducts.map((p) => {
              const days = Math.ceil((p.expiryDate!.getTime() - Date.now()) / 86_400_000);
              const expired = days < 0;
              return (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}/edit`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    expired ? "border-badge-sale/30 bg-badge-sale/[0.04] hover:bg-badge-sale/[0.08]" : "border-gold/30 bg-gold/[0.05] hover:bg-gold/[0.09]"
                  }`}
                >
                  <span className="truncate pr-3">{p.name}</span>
                  <span className={`shrink-0 text-xs font-medium ${expired ? "text-badge-sale" : "text-gold"}`}>
                    {expired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-ink/70 text-center py-8">{message}</p>;
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    DRAFT: "text-ink/70",
    PENDING: "text-gold",
    CONFIRMED: "text-rose-gold",
    PACKED: "text-rose-gold",
    SHIPPED: "text-rose-gold",
    DELIVERED: "text-success",
    CANCELLED: "text-badge-sale",
    RETURNED: "text-badge-sale",
    REFUNDED: "text-badge-sale",
  };
  return <span className={`text-[11px] font-medium ${tone[status] || "text-ink/70"}`}>{status}</span>;
}
