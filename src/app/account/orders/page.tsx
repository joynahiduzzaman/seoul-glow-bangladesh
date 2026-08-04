import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import Link from "next/link";
import DashboardEmptyState from "@/components/account/DashboardEmptyState";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders" };

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

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  const orders = user
    ? await prisma.order.findMany({
        // Excludes DRAFT — a staff-created draft isn't "this customer's order"
        // until it's actually confirmed.
        where: { userId: user.id, status: { not: "DRAFT" } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  if (orders.length === 0) {
    return <DashboardEmptyState icon={Package} message="You haven't placed any orders yet." ctaLabel="Start Shopping" ctaHref="/shop" />;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.orderNumber}`}
          className="block bg-white rounded-xl2 shadow-soft p-5 hover:shadow-e3 transition-shadow"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-medium">{order.orderNumber}</p>
              <p className="text-xs text-ink/70">{new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <span className={`text-xs rounded-full px-3 py-1 font-medium ${STATUS_STYLES[order.status] || "bg-beige"}`}>
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-ink/70">
            <span>{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
            <span className="font-semibold text-ink">{formatBDT(order.total)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
