import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import PrintButton from "@/components/admin/PrintButton";
import InvoiceDoc from "@/components/admin/print/InvoiceDoc";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  if (!order) return notFound();

  return (
    <div className="print-doc-page max-w-3xl mx-auto px-6 py-10">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label="Print Invoice" />
      </div>
      <InvoiceDoc order={order} siteName={SITE_NAME} supportEmail={SUPPORT_EMAIL} />
    </div>
  );
}
