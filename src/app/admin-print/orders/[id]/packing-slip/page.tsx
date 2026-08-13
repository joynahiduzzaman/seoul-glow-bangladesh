import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import PrintButton from "@/components/admin/PrintButton";
import PackingSlipDoc from "@/components/admin/print/PackingSlipDoc";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  if (!order) return notFound();

  return (
    <div className="print-doc-page max-w-3xl mx-auto px-6 py-10">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label="Print Packing Slip" />
      </div>
      <PackingSlipDoc order={order} siteName={SITE_NAME} />
    </div>
  );
}
