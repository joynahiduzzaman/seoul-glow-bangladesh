import { formatBDT } from "@/lib/utils";
import PrintButton from "@/components/admin/PrintButton";
import { parseReportFilters, getFullReport, type ReportFilterParams, type BreakdownRow } from "@/server/reports";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";

/**
 * The PDF export.
 *
 * There is no PDF engine in this project and no reason to add one: the browser
 * already renders these numbers and already writes excellent PDFs. This is a
 * print-styled view of exactly the report on screen, and "Print → Save as PDF"
 * produces the file — the same mechanism the invoices, packing slips and
 * shipping labels have always used.
 *
 * It carries the filters it was generated under, so a printed report can still
 * be understood a month later.
 */
function describe(f: ReturnType<typeof parseReportFilters>): string {
  const parts: string[] = [];
  if (f.from || f.to) parts.push(`${f.from || "the beginning"} to ${f.to || "today"}`);
  if (f.status) parts.push(`status ${f.status.toLowerCase()}`);
  if (f.payment) parts.push(`payment ${f.payment.toLowerCase()}`);
  if (f.courier) parts.push(f.courier === "NONE" ? "no courier assigned" : `courier ${f.courier.toLowerCase()}`);
  if (f.source) parts.push(`source ${f.source.toLowerCase().replace(/_/g, " ")}`);
  if (f.q) parts.push(`matching "${f.q}"`);
  return parts.length ? parts.join(" · ") : "All orders, no filters";
}

function Table({ title, rows, labelHeader, showUnits = true }: { title: string; rows: BreakdownRow[]; labelHeader: string; showUnits?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-8 print:break-inside-avoid">
      <h2 className="mb-2 font-display text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/60">
            <th className="pb-1.5">{labelHeader}</th>
            {showUnits && <th className="pb-1.5 text-right">Units</th>}
            <th className="pb-1.5 text-right">Orders</th>
            <th className="pb-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink/5">
              <td className="py-1.5">{r.label}{r.sublabel ? ` · ${r.sublabel}` : ""}</td>
              {showUnits && <td className="py-1.5 text-right tabular-nums">{r.units}</td>}
              <td className="py-1.5 text-right tabular-nums">{r.orders}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">{formatBDT(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function ReportPrintPage({ searchParams }: { searchParams: ReportFilterParams }) {
  const filters = parseReportFilters(searchParams);
  const report = await getFullReport(filters);
  const s = report.summary;

  const summaryRows: [string, string | number][] = [
    ["Orders", s.orders],
    ["Units sold", s.units],
    ["Gross (items)", formatBDT(s.gross)],
    ["Discounts", `-${formatBDT(s.discount)}`],
    ["Courier charges", formatBDT(s.shipping)],
    ["Net total", formatBDT(s.net)],
    ["Average order", formatBDT(s.averageOrder)],
    ["Delivered orders", s.deliveredOrders],
    ["Collected (delivered only)", formatBDT(s.deliveredNet)],
  ];

  return (
    <div className="print-doc-page mx-auto max-w-4xl px-6 py-10">
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink/70">Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot;.</p>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="bg-white p-10 shadow-soft print:p-0 print:shadow-none">
        <header className="mb-8 border-b border-ink/10 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-2xl font-semibold">{SITE_NAME}</h1>
              <p className="mt-0.5 text-sm text-ink/60">Sales report</p>
            </div>
            <div className="text-right text-xs text-ink/60">
              <p>Generated {new Date().toLocaleString("en-BD", { dateStyle: "long", timeStyle: "short" })}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink/70">
            <span className="font-semibold uppercase tracking-wide">Filters:</span> {describe(filters)}
          </p>
        </header>

        {s.orders === 0 ? (
          <p className="py-16 text-center text-sm text-ink/60">No orders matched these filters.</p>
        ) : (
          <>
            <section className="mb-8 print:break-inside-avoid">
              <h2 className="mb-2 font-display text-lg font-semibold">Summary</h2>
              <table className="w-full text-sm">
                <tbody>
                  {summaryRows.map(([label, value]) => (
                    <tr key={label} className="border-b border-ink/5">
                      <td className="py-1.5 text-ink/70">{label}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-8 print:break-inside-avoid">
              <h2 className="mb-2 font-display text-lg font-semibold">Sales by day</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/60">
                    <th className="pb-1.5">Date</th>
                    <th className="pb-1.5 text-right">Orders</th>
                    <th className="pb-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byDay.map((d) => (
                    <tr key={d.date} className="border-b border-ink/5">
                      <td className="py-1.5">{new Date(d.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{formatBDT(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <Table title="Product sales" labelHeader="Product" rows={report.products} />
            <Table title="Category sales" labelHeader="Category" rows={report.categories} />
            <Table title="Brand sales" labelHeader="Brand" rows={report.brands} />
            <Table title="Payment methods" labelHeader="Method" rows={report.payments} showUnits={false} />
            <Table title="Order sources" labelHeader="Source" rows={report.sources} showUnits={false} />

            <p className="mt-8 border-t border-ink/10 pt-4 text-[11px] leading-relaxed text-ink/60">
              Product, category and brand totals are line-item values and add up to the items subtotal, not the net —
              delivery and order-level discounts don&apos;t belong to any one product. Payment and source totals are
              whole orders and do add up to the net.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
