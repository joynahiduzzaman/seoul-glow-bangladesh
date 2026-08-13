"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { formatBDT } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderBadges";
import OrderActionsMenu from "./OrderActionsMenu";
import OrderDetailDrawer from "./OrderDetailDrawer";
import { UserCircle2 } from "lucide-react";
import OrderBulkBar from "./OrderBulkBar";
import OrderQuickAdvance from "./OrderQuickAdvance";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // A new page of results arrives as a fresh prop; the old rows (and any
  // selection pointing at them) have to go with it.
  useEffect(() => {
    setOrders(initialOrders);
    setSelected(new Set());
  }, [initialOrders]);

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

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <OrderBulkBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        onDone={() => {
          setSelected(new Set());
          // The server holds the truth for statuses, stock and the stat cards,
          // so re-fetching is the only honest way to show the result.
          router.refresh();
        }}
      />

      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="w-10 p-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all orders on this page"
                  className="h-4 w-4 accent-[#A35252]"
                />
              </th>
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
                  className={`border-b border-ink/5 cursor-pointer transition-colors ${
                    selected.has(o.id) ? "bg-soft-pink/15" : "hover:bg-beige/30"
                  }`}
                >
                  {/* stopPropagation: the row opens the drawer, and ticking a
                      box must not do that as well. */}
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleOne(o.id)}
                      aria-label={`Select order ${o.orderNumber}`}
                      className="h-4 w-4 accent-[#A35252]"
                    />
                  </td>
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <OrderStatusBadge status={o.status} />
                      <OrderQuickAdvance orderId={o.id} status={o.status} onDone={() => router.refresh()} />
                    </div>
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
          <div className="p-12 text-center">
            <p className="text-sm text-ink/70">No orders match this view.</p>
            <p className="mt-1 text-xs text-ink/50">Try clearing a filter, or widening the date range.</p>
          </div>
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
