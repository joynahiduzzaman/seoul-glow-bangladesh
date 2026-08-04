import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

export const metadata = { title: "Invoice" };

// Customer-facing counterpart to /admin-print/orders/[id]/invoice — same visual
// layout, but looked up by the order NUMBER a guest actually has (from the
// order-success page or a confirmation email), not the internal id, and with
// no auth requirement, matching how /track-order and checkout/success already
// look orders up by number for guests.
export default async function CustomerInvoicePage({ params }: { params: { orderNumber: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  if (!order) return notFound();

  const email = order.user?.email || order.guestEmail;

  return (
    <div className="print-doc-page max-w-3xl mx-auto px-6 py-10">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label="Download / Print Invoice" />
      </div>

      <div className="bg-white border border-ink/10 rounded-xl2 p-10 shadow-soft print:shadow-none print:border-0 print:p-0">
        <div className="flex items-start justify-between mb-10 pb-6 border-b border-ink/10">
          <div>
            <h1 className="font-display text-2xl font-semibold">{SITE_NAME}</h1>
            {SUPPORT_EMAIL && <p className="text-xs text-ink/70 mt-1">{SUPPORT_EMAIL}</p>}
          </div>
          <div className="text-right">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink/70">Invoice</h2>
            <p className="text-sm text-ink/70 mt-1">{order.orderNumber}</p>
            <p className="text-xs text-ink/70">
              {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1.5">Billed To</p>
            <p className="font-medium">{order.user?.name || order.shippingName}</p>
            {email && <p className="text-ink/70">{email}</p>}
            <p className="text-ink/70">{order.shippingPhone}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1.5">Ship To</p>
            <p className="font-medium">{order.shippingName}</p>
            <p className="text-ink/70">{order.shippingStreet}, {order.shippingArea}</p>
            <p className="text-ink/70">{order.shippingDistrict}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="text-left border-b-2 border-ink/10 text-ink/70">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Unit Price</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-ink/5">
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatBDT(item.price)}</td>
                <td className="py-3 text-right font-medium">{formatBDT(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-10">
          <div className="w-64 text-sm space-y-1.5">
            <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-rose-gold">
                <span>Discount {order.couponCode && `(${order.couponCode})`}</span><span>-{formatBDT(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{formatBDT(order.shippingFee)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-ink/10"><span>Total</span><span>{formatBDT(order.total)}</span></div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-ink/10 text-xs text-ink/70">
          <p>Payment Method: {order.paymentMethod} · Status: {order.paymentStatus}</p>
          <p>Thank you for shopping with {SITE_NAME}.</p>
        </div>
      </div>
    </div>
  );
}
