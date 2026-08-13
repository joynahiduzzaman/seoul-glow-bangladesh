import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import InvoiceDoc from "@/components/admin/print/InvoiceDoc";
import PackingSlipDoc from "@/components/admin/print/PackingSlipDoc";
import ShippingLabelDoc from "@/components/admin/print/ShippingLabelDoc";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

const DOC_LABELS: Record<string, string> = {
  invoice: "Invoices",
  "packing-slip": "Packing Slips",
  "shipping-label": "Shipping Labels",
};

/** Same ceiling as the bulk API — a hundred documents is already a long print
 *  job, and beyond it the query and the render both stop being reasonable. */
const MAX_DOCS = 100;

/**
 * Batch printing: one document per selected order, each on its own sheet.
 *
 * Renders the same three components the single-order routes use rather than a
 * print-only variant of each, so a batch-printed invoice is byte-for-byte the
 * one you get printing that order on its own.
 *
 * Orders arrive as ?ids=a,b,c and are rendered in the order the admin's list
 * had them, not whatever order the database returns — a stack of labels that
 * doesn't match the stack of parcels is worse than no labels.
 */
export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: { ids?: string; type?: string };
}) {
  // This route sits outside /admin, so it carries its own guard rather than
  // relying on the admin layout's.
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) redirect("/login");

  const type = searchParams.type && DOC_LABELS[searchParams.type] ? searchParams.type : "invoice";
  const ids = (searchParams.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_DOCS);

  const orders = ids.length
    ? await prisma.order.findMany({
        where: { id: { in: ids } },
        include: { items: true, shipment: true, user: { select: { name: true, email: true } } },
      })
    : [];
  const byId = new Map(orders.map((o) => [o.id, o]));
  const ordered = ids.map((id) => byId.get(id)).filter((o): o is (typeof orders)[number] => Boolean(o));

  if (ordered.length === 0) {
    return (
      <div className="print-doc-page mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Nothing to print</h1>
        <p className="mt-2 text-sm text-ink/70">
          {ids.length > 0
            ? "Those orders no longer exist. Go back and reselect them."
            : "No orders were selected. Pick some orders and choose a print action."}
        </p>
      </div>
    );
  }

  const isLabel = type === "shipping-label";

  return (
    <div className={`print-doc-page mx-auto px-6 py-10 ${isLabel ? "max-w-md" : "max-w-3xl"}`}>
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink/70">
          {ordered.length} {DOC_LABELS[type].toLowerCase()}
          {ordered.length < ids.length && ` · ${ids.length - ordered.length} order(s) could not be found`}
        </p>
        <PrintButton label={`Print ${ordered.length} ${DOC_LABELS[type]}`} />
      </div>

      <div className="space-y-10">
        {ordered.map((order, i) => (
          <div
            key={order.id}
            // break-after rather than break-before: a trailing blank sheet at
            // the end of the job is the classic batch-print annoyance.
            className={i < ordered.length - 1 ? "print:break-after-page" : ""}
          >
            {type === "invoice" && <InvoiceDoc order={order} siteName={SITE_NAME} supportEmail={SUPPORT_EMAIL} />}
            {type === "packing-slip" && <PackingSlipDoc order={order} siteName={SITE_NAME} />}
            {type === "shipping-label" && <ShippingLabelDoc order={order} shipment={order.shipment} siteName={SITE_NAME} />}
          </div>
        ))}
      </div>
    </div>
  );
}
