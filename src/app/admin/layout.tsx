import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import AdminShell from "@/components/admin/AdminShell";
import SessionKeepAlive from "@/components/admin/SessionKeepAlive";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Badge counts computed once per request — cheap counts, not full record fetches.
  // Middleware already blocks non-staff before this layout ever renders, so no
  // auth check is needed here; this file only handles the shell + these badges.
  const [pendingOrders, openTickets, lowStockCount] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.product.count({ where: { stock: { lt: 10 } } }),
  ]);

  const nav = [
    { label: "Dashboard", href: "/admin", icon: "dashboard" as const },
    { label: "Homepage", href: "/admin/homepage", icon: "homepage" as const },
    { label: "Site Content", href: "/admin/content", icon: "content" as const },
    { label: "Products", href: "/admin/products", icon: "products" as const },
    { label: "Categories", href: "/admin/categories", icon: "categories" as const },
    { label: "Brands", href: "/admin/brands", icon: "brands" as const },
    { label: "Inventory", href: "/admin/inventory", icon: "inventory" as const, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { label: "Orders", href: "/admin/orders", icon: "orders" as const, badge: pendingOrders > 0 ? pendingOrders : undefined },
    { label: "Reports", href: "/admin/reports", icon: "reports" as const },
    { label: "Coupons", href: "/admin/coupons", icon: "coupons" as const },
    { label: "Affiliates", href: "/admin/affiliates", icon: "affiliates" as const },
    { label: "Support Tickets", href: "/admin/support-tickets", icon: "support" as const, badge: openTickets > 0 ? openTickets : undefined },
  ];

  return (
    <AdminShell nav={nav} userName={user?.name || ""} userRole={user?.role || ""}>
      {/* Mounted for the whole panel, not only the product form: any admin
          screen can sit open past the access token's fifteen minutes. */}
      <SessionKeepAlive />
      {children}
    </AdminShell>
  );
}
