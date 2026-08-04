import { prisma } from "@/server/db";
import Link from "next/link";
import Image from "next/image";
import { formatBDT } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Truck, Search, Download, MapPin, CreditCard, Package, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; pending?: string; payment_failed?: string };
}) {
  const order = searchParams.order
    ? await prisma.order.findUnique({ where: { orderNumber: searchParams.order }, include: { items: true, shipment: true } })
    : null;

  if (searchParams.payment_failed) {
    return (
      <div className="container-px mx-auto py-24 text-center max-w-md mx-auto">
        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
        <h1 className="font-display text-2xl mb-2">Payment Didn't Complete</h1>
        <p className="text-ink/70 mb-6">Your order was saved but payment wasn't confirmed. You can retry from your account, or contact us for help.</p>
        <Link href="/" className="btn-primary">Back to Home</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-px mx-auto py-24 text-center">
        <h1 className="font-display text-2xl">Order not found</h1>
      </div>
    );
  }

  const estimatedDelivery = order.shipment?.estimatedDelivery
    ? new Date(order.shipment.estimatedDelivery).toLocaleDateString("en-BD", { month: "long", day: "numeric", year: "numeric" })
    : order.insideDhaka ? "1–3 business days" : "2–5 business days";

  return (
    <div className="container-px mx-auto py-14 md:py-20 max-w-3xl">
      {/* Success header */}
      <div className="text-center mb-10 md:mb-12 animate-fade-up">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={32} strokeWidth={2} />
        </div>
        <p className="eyebrow mb-2">Order Confirmed</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">Thank you — your glow is on its way.</h1>
        <p className="text-ink/70 mt-3">
          Order <strong className="text-ink">{order.orderNumber}</strong> ·{" "}
          {order.paymentStatus === "PAID" ? "Payment received" : "Pending payment / Cash on Delivery"}
        </p>
      </div>

      {/* Mini progress teaser — full detail lives on /track-order */}
      <Link
        href={`/track-order?order=${order.orderNumber}`}
        className="group mb-8 flex items-center justify-between gap-4 rounded-xl2 bg-ink text-cream p-5 md:p-6 shadow-e2 hover:shadow-e3 transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-gold/20 text-rose-gold-light">
            <Truck size={19} />
          </span>
          <div>
            <p className="text-sm font-medium">Estimated delivery: {estimatedDelivery}</p>
            <p className="text-xs text-cream/55 mt-0.5">Tap to follow your order step by step</p>
          </div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-cream/55 transition-transform group-hover:translate-x-1 group-hover:text-cream" />
      </Link>

      {/* Items */}
      <div className="rounded-xl2 bg-white shadow-e2 p-5 md:p-6 mb-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold shrink-0"><Package size={13} /></span>
          Items ({order.items.length})
        </h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 items-center">
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

        <div className="mt-4 pt-4 border-t border-border-soft text-sm space-y-1.5">
          <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-rose-gold"><span>Discount</span><span>-{formatBDT(order.discount)}</span></div>}
          <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{formatBDT(order.shippingFee)}</span></div>
          <div className="flex justify-between font-semibold text-base border-t border-border-soft pt-2"><span>Total</span><span>{formatBDT(order.total)}</span></div>
        </div>
      </div>

      {/* Shipping + Payment */}
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <InfoCard icon={<MapPin size={14} />} title="Shipping Address">
          <p className="text-sm">{order.shippingName}</p>
          <p className="text-sm text-ink/70">{order.shippingPhone}</p>
          <p className="text-sm text-ink/70 mt-1">{order.shippingStreet}, {order.shippingArea}</p>
          <p className="text-sm text-ink/70">{order.shippingDistrict} · {order.insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
        </InfoCard>

        <InfoCard icon={<CreditCard size={14} />} title="Payment">
          <p className="text-sm">{order.paymentMethod} · <span className="text-ink/70">{order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}</span></p>
          <p className="text-xs text-ink/70 mt-2">A copy of this receipt is available anytime via Download Invoice below.</p>
        </InfoCard>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link href="/shop" className="btn-primary text-center">Continue Shopping</Link>
        <Link
          href={`/track-order?order=${order.orderNumber}`}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm font-medium hover:border-rose-gold hover:text-rose-gold-text transition-colors"
        >
          <Search size={15} /> Track Order
        </Link>
        <Link
          href={`/invoice/${order.orderNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm font-medium hover:border-rose-gold hover:text-rose-gold-text transition-colors"
        >
          <Download size={15} /> Download Invoice
        </Link>
      </div>
    </div>
  );
}
