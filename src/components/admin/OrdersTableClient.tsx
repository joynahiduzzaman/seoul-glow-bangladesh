"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { formatBDT } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderBadges";
import OrderActionsMenu from "./OrderActionsMenu";
import OrderDetailDrawer from "./OrderDetailDrawer";
import { UserCircle2 } from "lucide-react";

export interface OrderRow {
  id: string;
  orderNumber: string;
  shippingName: string;
  shippingPhone: string;
  guestEmail: string | null;
  user: { name: string; email: string } | null;
  items: { id: string }[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  assignedStaff: { name: string } | null;
  createdAt: string | Date;
}

export default function OrdersTableClient({ orders: initialOrders }: { orders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-opens the drawer for an order just created via /admin/orders/new (which
  // redirects here with ?highlight=<id>) — then strips the param so a page
  // refresh or back-navigation doesn't keep reopening it.
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setOpenOrderId(highlight);
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Items</th>
              <th className="p-4">Total</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4">Assigned</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const email = o.user?.email || o.guestEmail;
              return (
                <tr
                  key={o.id}
                  onClick={() => setOpenOrderId(o.id)}
                  className="border-b border-ink/5 cursor-pointer hover:bg-beige/30 transition-colors"
                >
                  <td className="p-4">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-[11px] text-ink/70">
                      {new Date(o.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </td>
                  <td className="p-4 text-ink/70">
                    <p className="font-medium text-ink">{o.user?.name || o.shippingName}</p>
                    <p className="text-xs text-ink/70">{o.shippingPhone}</p>
                    {email && <p className="text-xs text-ink/70">{email}</p>}
                  </td>
                  <td className="p-4 text-ink/70">{o.items.length}</td>
                  <td className="p-4 font-medium">{formatBDT(o.total)}</td>
                  <td className="p-4">
                    <PaymentStatusBadge status={o.paymentStatus} method={o.paymentMethod} />
                  </td>
                  <td className="p-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="p-4 text-ink/70">
                    {o.assignedStaff ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <UserCircle2 size={13} /> {o.assignedStaff.name}
                      </span>
                    ) : (
                      <span className="text-xs text-ink/30">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4">
                    <OrderActionsMenu orderId={o.id} onView={() => setOpenOrderId(o.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-12 text-center text-ink/70 text-sm">No orders match this view.</p>
        )}
      </div>

      <OrderDetailDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
        onUpdated={(updated) =>
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status, paymentStatus: updated.paymentStatus, assignedStaff: updated.assignedStaff }
                : o
            )
          )
        }
      />
    </div>
  );
}
