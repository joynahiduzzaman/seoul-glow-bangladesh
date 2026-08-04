"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Loader2, Package, Truck, MapPin, CreditCard, Clock, Check, ShoppingBag, Navigation, Home } from "lucide-react";
import { formatBDT } from "@/lib/utils";

// "Out for Delivery" isn't a real Order.status (see src/lib/order-status.ts) —
// it's derived from Shipment.deliveryStatus, which already has this value (see
// src/lib/shipping.ts). Keeping the order lifecycle's own status enum untouched
// and just layering this on for display avoids touching stock-reservation and
// status-transition logic that has nothing to do with the tracking timeline.
const STEPS = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};
const STEP_ICONS: Record<(typeof STEPS)[number], typeof Package> = {
  PENDING: Check,
  CONFIRMED: Check,
  PACKED: Package,
  SHIPPED: Truck,
  OUT_FOR_DELIVERY: Navigation,
  DELIVERED: Home,
};

/** Maps the real order status + shipment delivery status onto a position in
 * the 6-step display timeline above. */
function getTimelineIndex(status: string, deliveryStatus: string | null): number {
  if (status === "DELIVERED") return 5;
  if (status === "SHIPPED" && deliveryStatus === "OUT_FOR_DELIVERY") return 4;
  if (status === "SHIPPED") return 3;
  if (status === "PACKED") return 2;
  if (status === "CONFIRMED") return 1;
  return 0;
}

interface TrackedItem { name: string; image: string | null; price: number; quantity: number }
interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  items: TrackedItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shipping: { name: string; phone: string; district: string; area: string; street: string; insideDhaka: boolean };
  courier: string | null;
  trackingNumber: string | null;
  deliveryStatus: string | null;
  estimatedDelivery: string | null;
  estimatedDeliveryEstimate: string;
}

function OrderTimeline({ status, deliveryStatus }: { status: string; deliveryStatus: string | null }) {
  const reducedMotion = useReducedMotion();

  if (status === "CANCELLED" || status === "RETURNED" || status === "REFUNDED") {
    return (
      <div className="rounded-xl2 bg-badge-sale/10 border border-badge-sale/20 px-4 py-3 text-sm font-medium text-badge-sale">
        This order was {status.toLowerCase()}.
      </div>
    );
  }

  const currentIndex = getTimelineIndex(status, deliveryStatus);
  const isFullyDelivered = currentIndex === STEPS.length - 1;

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex && !isFullyDelivered;
        const isLast = i === STEPS.length - 1;
        const Icon = STEP_ICONS[step];
        return (
          <div key={step} className={`flex items-start ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative flex h-9 w-9 items-center justify-center">
                {/* Pulsing halo on whichever step is currently active — skipped
                    entirely under prefers-reduced-motion rather than just made
                    faster, since a looping animation is exactly what that
                    setting asks to avoid. */}
                {isCurrent && !reducedMotion && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-rose-gold/40"
                    animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  initial={false}
                  animate={{ scale: done ? 1 : 0.9 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? "bg-rose-gold text-white" : "bg-beige text-ink/30"
                  }`}
                >
                  {done ? <Icon size={15} /> : i + 1}
                </motion.span>
              </div>
              <span className={`text-[11px] sm:text-xs text-center leading-tight ${done ? "text-ink font-medium" : "text-ink/35"}`}>{STEP_LABELS[step]}</span>
            </div>
            {!isLast && (
              <div className="relative h-0.5 flex-1 mx-1.5 sm:mx-2 mt-4 bg-beige overflow-hidden rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-rose-gold rounded-full"
                  initial={false}
                  animate={{ width: i < currentIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrderClient() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      toast.error("Enter both your order number and phone number");
      return;
    }
    setLoading(true);
    setOrder(null);
    setSearched(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Order not found");
        return;
      }
      setOrder(data.order);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
        <div>
          <label className="field-label">Order Number</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. SGB260729-1234"
            className="field"
          />
        </div>
        <div>
          <label className="field-label">Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="The phone number used at checkout"
            className="field"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? "Searching…" : "Track Order"}
        </button>
      </form>

      {searched && !loading && !order && (
        <p className="text-center text-sm text-ink/70 mt-6">
          No order found with that order number and phone number. Double-check both and try again.
        </p>
      )}

      {order && (
        <div className="mt-8 space-y-5 animate-fade-up">
          <div className="rounded-xl2 bg-white shadow-e2 p-6 md:p-7">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
              <div>
                <p className="text-xs text-ink/70">Order</p>
                <p className="font-display text-xl font-semibold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink/70">Placed</p>
                <p className="text-sm font-medium">
                  {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <OrderTimeline status={order.status} deliveryStatus={order.deliveryStatus} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <InfoCard icon={<MapPin size={15} />} title="Shipping Address">
              <p className="text-sm">{order.shipping.name}</p>
              <p className="text-sm text-ink/70">{order.shipping.phone}</p>
              <p className="text-sm text-ink/70 mt-1">{order.shipping.street}, {order.shipping.area}</p>
              <p className="text-sm text-ink/70">{order.shipping.district} · {order.shipping.insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
            </InfoCard>

            <InfoCard icon={<CreditCard size={15} />} title="Payment">
              <p className="text-sm">{order.paymentMethod} · <span className="text-ink/70">{order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}</span></p>
              <div className="mt-3 pt-3 border-t border-border-soft text-sm space-y-1">
                <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
                {order.discount > 0 && <div className="flex justify-between text-rose-gold"><span>Discount</span><span>-{formatBDT(order.discount)}</span></div>}
                <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{formatBDT(order.shippingFee)}</span></div>
                <div className="flex justify-between font-semibold border-t border-border-soft pt-1"><span>Total</span><span>{formatBDT(order.total)}</span></div>
              </div>
            </InfoCard>

            <InfoCard icon={<Truck size={15} />} title="Courier & Tracking">
              {order.courier ? (
                <>
                  <p className="text-sm">{order.courier}</p>
                  {order.trackingNumber && <p className="text-sm text-ink/70 font-mono mt-1">{order.trackingNumber}</p>}
                </>
              ) : (
                <p className="text-sm text-ink/70">Not assigned yet</p>
              )}
            </InfoCard>

            <InfoCard icon={<Clock size={15} />} title="Estimated Delivery">
              <p className="text-sm">
                {order.estimatedDelivery
                  ? new Date(order.estimatedDelivery).toLocaleDateString("en-BD", { month: "long", day: "numeric", year: "numeric" })
                  : order.estimatedDeliveryEstimate}
              </p>
              <p className="text-xs text-ink/70 mt-2">Last updated {new Date(order.updatedAt).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </InfoCard>
          </div>

          <InfoCard icon={<Package size={15} />} title={`Items (${order.items.length})`}>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-beige shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-ink/70">Qty {item.quantity} × {formatBDT(item.price)}</p>
                  </div>
                  <span className="text-sm font-medium shrink-0">{formatBDT(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          <div className="text-center pt-2">
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-rose-gold-text hover:underline">
              <ShoppingBag size={15} /> Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 bg-white shadow-e2 p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold shrink-0">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
