import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { COURIER_LABELS, CourierValue } from "@/lib/shipping";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";

// A physical parcel label — deliberately no prices (same reasoning as the
// packing slip). Renders even if no shipment has been assigned yet, so an
// admin can still preview/print a label shell before a courier is picked;
// courier-specific fields just show as blanks.
export default async function ShippingLabelPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { shipment: true, items: { select: { quantity: true } } },
  });
  if (!order) return notFound();

  const shipment = order.shipment;
  const courierLabel = shipment
    ? shipment.courier === "CUSTOM"
      ? shipment.customCourierName || "Custom"
      : COURIER_LABELS[shipment.courier as CourierValue] || shipment.courier
    : null;
  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="print-doc-page max-w-md mx-auto px-6 py-10">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label="Print Shipping Label" />
      </div>

      <div className="bg-white border-2 border-ink rounded-xl2 p-8 print:border-2 print:shadow-none">
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-ink">
          <div>
            <p className="font-display text-lg font-semibold">{SITE_NAME}</p>
            <p className="text-[11px] text-ink/70">100% Authentic · Direct from Seoul</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-ink/70">Courier</p>
            <p className="text-sm font-semibold">{courierLabel || "Unassigned"}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1">Deliver To</p>
          <p className="text-lg font-semibold leading-snug">{order.shippingName}</p>
          <p className="text-base">{order.shippingPhone}</p>
          <p className="text-sm text-ink/70 mt-1">{order.shippingStreet}, {order.shippingArea}</p>
          <p className="text-sm text-ink/70">{order.shippingDistrict} · {order.insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-ink/10 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70">Order #</p>
            <p className="font-mono font-medium">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70">Items</p>
            <p className="font-medium">{totalItems}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70">COD Amount</p>
            <p className="font-medium">{order.paymentMethod === "COD" ? order.total.toFixed(0) + " BDT" : "Prepaid"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/70">Est. Delivery</p>
            <p className="font-medium">
              {shipment?.estimatedDelivery
                ? new Date(shipment.estimatedDelivery).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
                : "—"}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-ink text-center">
          <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1">Tracking Number</p>
          <p className="font-mono text-2xl font-bold tracking-wider">{shipment?.trackingNumber || "—"}</p>
        </div>

        {shipment?.shippingNotes && (
          <div className="mt-6 pt-4 border-t border-ink/10 text-xs">
            <p className="text-[11px] uppercase tracking-wide text-ink/70 mb-1">Notes</p>
            <p className="text-ink/70">{shipment.shippingNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
