import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatBDT, parseJsonArray } from "@/lib/utils";
import {
  Package, Heart, ArrowRight, ShieldCheck, MapPin, Ticket, LifeBuoy, Bell,
  ShoppingBag, UserCog, Copy,
} from "lucide-react";
import DashboardEmptyState from "@/components/account/DashboardEmptyState";
import OrderStatusTracker from "@/components/account/OrderStatusTracker";
import RecentlyViewedRail from "@/components/RecentlyViewedRail";
import { revenueWhere } from "@/server/revenue";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Dashboard" };

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PACKED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-pastel-green/50 text-ink",
  CANCELLED: "bg-red-100 text-red-600",
  RETURNED: "bg-red-100 text-red-600",
  REFUNDED: "bg-red-100 text-red-600",
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-pastel-green/50 text-ink",
  CLOSED: "bg-beige text-ink/70",
};

export default async function AccountDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  const [
    orders,
    orderCount,
    wishlistCount,
    totalSpentAgg,
    addressCount,
    activeCoupons,
    supportTicketCount,
    recentTickets,
    unreadNotifCount,
    recentNotifications,
    latestWishlist,
  ] = await Promise.all([
    // Excludes DRAFT — a staff-created draft that hasn't been confirmed yet isn't
    // "this customer's order" until it actually is one.
    prisma.order.findMany({ where: { userId: user.id, status: { not: "DRAFT" } }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.order.count({ where: { userId: user.id, status: { not: "DRAFT" } } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ where: { ...revenueWhere, userId: user.id }, _sum: { total: true } }),
    prisma.address.count({ where: { userId: user.id } }),
    // Same "active + not expired" filter as /api/coupons/active — coupons aren't
    // per-user in this schema, so "available to you" means "currently valid".
    prisma.coupon.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.supportTicket.count({ where: { userId: user.id } }),
    prisma.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { product: { include: { brand: { select: { name: true, slug: true } } } } },
    }),
  ]);

  const totalSpent = totalSpentAgg._sum.total || 0;
  const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
  const mostRecentOrder = orders[0];

  const STAT_CARDS = [
    { icon: Package, label: "Total Orders", value: orderCount, href: "/account/orders" },
    { icon: ShoppingBag, label: "Total Spent", value: formatBDT(totalSpent), href: "/account/orders" },
    { icon: Heart, label: "Wishlist Items", value: wishlistCount, href: "/account/wishlist" },
    { icon: MapPin, label: "Saved Addresses", value: addressCount, href: "/account/addresses" },
    { icon: Ticket, label: "Available Coupons", value: activeCoupons.length, href: "/account/coupons" },
    { icon: LifeBuoy, label: "Support Tickets", value: supportTicketCount, href: "/account/support" },
  ];

  const QUICK_ACTIONS = [
    { label: "Continue Shopping", href: "/shop", icon: ShoppingBag },
    { label: "View Orders", href: "/account/orders", icon: Package },
    { label: "Wishlist", href: "/account/wishlist", icon: Heart },
    { label: "Edit Profile", href: "/account/profile", icon: UserCog },
    { label: "Manage Addresses", href: "/account/addresses", icon: MapPin },
    { label: "Contact Support", href: "/account/support", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl mb-1">Welcome back, {user.name.split(" ")[0]}</h2>
          <p className="text-sm text-ink/70">Here's what's happening with your account.</p>
        </div>
        {isStaff && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 h-10 rounded-xl bg-ink text-white px-5 text-sm font-medium hover:-translate-y-0.5 transition-all shrink-0"
          >
            <ShieldCheck size={15} /> Go to Admin Dashboard
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="card-surface p-5 hover:ring-1 hover:ring-rose-gold/30 transition-all">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold mb-3">
              <Icon size={16} />
            </span>
            <p className="text-xs uppercase tracking-wide text-ink/70 mb-1">{label}</p>
            <p className="font-display text-xl font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/70 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 bg-white rounded-xl2 px-3 py-4 shadow-soft hover:shadow-e3 hover:-translate-y-0.5 transition-all text-center">
              <Icon size={17} className="text-rose-gold" />
              <span className="text-xs font-medium text-ink leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Most recent order — simple status tracker */}
      {mostRecentOrder && (
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg">Latest Order</h3>
              <p className="text-xs text-ink/70">{mostRecentOrder.orderNumber}</p>
            </div>
            <Link href={`/account/orders/${mostRecentOrder.orderNumber}`} className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
              View details <ArrowRight size={12} />
            </Link>
          </div>
          <OrderStatusTracker status={mostRecentOrder.status} />
        </div>
      )}

      {/* Recent orders */}
      <div className="card-surface p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg">Recent Orders</h3>
          <Link href="/account/orders" className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <DashboardEmptyState icon={Package} message="You haven't placed any orders yet." ctaLabel="Start Shopping" ctaHref="/shop" />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.orderNumber}`} className="flex items-center justify-between gap-4 border-b border-ink/5 pb-4 last:border-0 last:pb-0 hover:opacity-70 transition-opacity">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-ink/70">
                    {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs rounded-full px-3 py-1 font-medium ${STATUS_STYLES[order.status] || "bg-beige"}`}>{order.status}</span>
                  <span className="font-semibold text-sm">{formatBDT(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${activeCoupons.length > 0 ? "md:grid-cols-2" : ""}`}>
        {/* Wishlist preview */}
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg">Latest Wishlist Items</h3>
            <Link href="/account/wishlist" className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {latestWishlist.length === 0 ? (
            <DashboardEmptyState icon={Heart} message="Save products you love to find them here later." ctaLabel="Browse Products" ctaHref="/shop" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {latestWishlist.map((w) => {
                const wishlistImages = parseJsonArray(w.product.images);
                return (
                  <Link key={w.id} href={`/product/${w.product.slug}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-beige shrink-0">
                      {wishlistImages[0] && (
                        <Image src={wishlistImages[0]} alt={w.product.name} fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{w.product.name}</p>
                      <p className="text-xs text-rose-gold-text">{formatBDT(w.product.price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Coupons preview — hidden entirely (not an empty state) when there are
            no active coupons, per spec. The grid above drops to a single column
            in that case so Wishlist doesn't leave an empty half. */}
        {activeCoupons.length > 0 && (
          <div className="card-surface p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg">Available Coupons</h3>
              <Link href="/account/coupons" className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {activeCoupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between border border-dashed border-rose-gold/30 rounded-lg px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold tracking-wide">{c.code}</p>
                    <p className="text-xs text-ink/70">
                      {c.type === "PERCENT" ? `${c.value}% off` : `${formatBDT(c.value)} off`}
                      {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <Copy size={13} className="text-ink/30 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg flex items-center gap-2">
              Notifications
              {unreadNotifCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-gold px-1.5 text-[10px] font-semibold text-white">{unreadNotifCount}</span>
              )}
            </h3>
            <Link href="/account/notifications" className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <DashboardEmptyState icon={Bell} message="You're all caught up — no notifications yet." />
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((n) => (
                <div key={n.id} className="flex gap-2.5 border-b border-ink/5 pb-3 last:border-0 last:pb-0">
                  <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-transparent" : "bg-rose-gold"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-ink/70 truncate">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support tickets */}
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg">Support Tickets</h3>
            <Link href="/account/support" className="text-xs text-rose-gold-text font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <DashboardEmptyState icon={LifeBuoy} message="No support tickets yet." ctaLabel="Contact Support" ctaHref="/account/support" />
          ) : (
            <div className="space-y-3">
              {recentTickets.map((t) => (
                <Link key={t.id} href="/account/support" className="flex items-center justify-between gap-3 border-b border-ink/5 pb-3 last:border-0 last:pb-0 hover:opacity-70 transition-opacity">
                  <p className="text-sm truncate">{t.subject}</p>
                  <span className={`text-[11px] rounded-full px-2.5 py-1 font-medium shrink-0 ${TICKET_STATUS_STYLES[t.status] || "bg-beige"}`}>{t.status.replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently viewed */}
      <div className="card-surface p-6">
        <h3 className="font-display text-lg mb-5">Recently Viewed</h3>
        <RecentlyViewedRail showEmptyState compact />
      </div>
    </div>
  );
}
