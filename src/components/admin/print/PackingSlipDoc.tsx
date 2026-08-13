import type { PrintableOrder } from "./InvoiceDoc";

/**
 * Deliberately no prices or payment info — a packing slip travels physically
 * inside the parcel, so it never shows monetary amounts (standard practice, and
 * it avoids exposing internal or discounted pricing to whoever opens the box).
 *
 * Shared by the single-order and batch print routes so the two can't diverge.
 */
export default function PackingSlipDoc({
  order,
  siteName,
}: {
  order: PrintableOrder & { insideDhaka: boolean };
  siteName: string;
}) {
  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="bg-white border border-ink/10 rounded-xl2 p-10 shadow-soft print:shadow-none print:border-0 print:p-0">
      <div className="flex items-start justify-between mb-10 pb-6 border-b border-ink/10">
        <div>
          <h1 className="font-display text-2xl font-semibold">{siteName}</h1>
          <p className="text-xs text-ink/70 mt-1">100% Authentic · Direct from Seoul</p>
        </div>
        <div className="text-right">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink/70">Packing Slip</h2>
          <p className="text-sm text-ink/70 mt-1">{order.orderNumber}</p>
          <p className="text-xs text-ink/70">
            {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mb-10 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1.5">Ship To</p>
        <p className="font-medium">{order.shippingName}</p>
        <p className="text-ink/70">{order.shippingStreet}, {order.shippingArea}</p>
        <p className="text-ink/70">{order.shippingDistrict} · {order.insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
        <p className="text-ink/70">{order.shippingPhone}</p>
      </div>

      {order.giftNote && (
        <div className="mb-8 p-4 bg-beige/60 rounded-lg text-sm">
          <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1">Gift Note</p>
          <p className="italic text-ink/70">&quot;{order.giftNote}&quot;</p>
        </div>
      )}

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="text-left border-b-2 border-ink/10 text-ink/70">
            <th className="pb-2">Item</th>
            <th className="pb-2 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-ink/5">
              <td className="py-3">{item.name}</td>
              <td className="py-3 text-right font-medium">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 font-semibold">Total Items</td>
            <td className="pt-3 text-right font-semibold">{totalItems}</td>
          </tr>
        </tfoot>
      </table>

      <div className="pt-6 border-t border-ink/10 text-xs text-ink/70 text-center">
        <p>Thank you for shopping with {siteName}.</p>
      </div>
    </div>
  );
}
