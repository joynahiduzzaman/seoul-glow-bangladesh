import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import PrintButton from "@/components/admin/PrintButton";
import ShippingLabelDoc from "@/components/admin/print/ShippingLabelDoc";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";

export default async function ShippingLabelPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { shipment: true, items: true, user: { select: { name: true, email: true } } },
  });
  if (!order) return notFound();

  return (
    <div className="print-doc-page max-w-md mx-auto px-6 py-10">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label="Print Shipping Label" />
      </div>
      <ShippingLabelDoc order={order} shipment={order.shipment} siteName={SITE_NAME} />
    </div>
  );
}
