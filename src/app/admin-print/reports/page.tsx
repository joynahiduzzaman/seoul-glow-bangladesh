import { formatBDT } from "@/lib/utils";
import PrintButton from "@/components/admin/PrintButton";
import { parseReportFilters, getFullReport, type ReportFilterParams, type BreakdownRow } from "@/server/reports";

export const dynamic = "force-dynamic";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Seoul Glow Bangladesh";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

/**
 * The PDF export.
 *
 * Lives under /admin-print rather than /admin on purpose: everything under
 * /admin is wrapped in AdminShell, so the first version of this page printed
 * the sidebar, the nav and the page chrome into the PDF. The .print-doc-page
 * rule in globals.css hides body's non-main children, and the sidebar is
 * inside main — it was never going to catch it. /admin-print is the
 * chrome-free route the invoices and packing slips already use, and the
 * middleware matcher covers it.
 *
 * There is no PDF engine in this project and no reason to add one: the browser
 * renders these numbers and writes excellent PDFs. "Print → Save as PDF"
 * produces the file.
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

/** A page-break-safe section. Tables are allowed to split across pages —
 *  forcing a long product list onto one sheet just leaves it clipped — but a
 *  heading never separates from the rows beneath it. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2.5 border-b-2 border-ink pb-1 font-display text-[15px] font-semibold uppercase tracking-[0.08em] print:break-after-avoid">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ rows, labelHeader, showUnits = true }: { rows: BreakdownRow[]; labelHeader: string; showUnits?: boolean }) {
  if (rows.length === 0) return <p className="py-3 text-xs text-ink/50">Nothing in this range.</p>;
  const total = rows.reduce((s, r) => s + r.total, 0);
  const units = rows.reduce((s, r) => s + r.units, 0);
  const orders = rows.reduce((s, r) => s + r.orders, 0);

  return (
    <table className="w-full text-[11.5px]">
      <thead className="print:table-header-group">
        <tr className="border-b border-ink/25 text-left text-[9.5px] uppercase tracking-[0.08em] text-ink/60">
          <th className="pb-1.5 font-semibold">{labelHeader}</th>
          {showUnits && <th className="pb-1.5 text-right font-semibold">Units</th>}
          <th className="pb-1.5 text-right font-semibold">Orders</th>
          <th className="pb-1.5 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-ink/[0.08] print:break-inside-avoid">
            <td className="py-[5px] pr-3">
              {r.label}
              {r.sublabel && <span className="text-ink/50"> · {r.sublabel}</span>}
            </td>
            {showUnits && <td className="py-[5px] text-right tabular-nums">{r.units}</td>}
            <td className="py-[5px] text-right tabular-nums">{r.orders}</td>
            <td className="py-[5px] text-right font-medium tabular-nums">{formatBDT(r.total)}</td>
          </tr>
        ))}
      </tbody>
      {/* A total row, because the first thing anyone does with a printed
          breakdown is add up the column to check it. */}
      <tfoot>
        <tr className="border-t-2 border-ink font-semibold">
          <td className="pt-1.5">Total</td>
          {showUnits && <td className="pt-1.5 text-right tabular-nums">{units}</td>}
          <td className="pt-1.5 text-right tabular-nums">{orders}</td>
          <td className="pt-1.5 text-right tabular-nums">{formatBDT(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default async function ReportPrintPage({ searchParams }: { searchParams: ReportFilterParams }) {
  const filters = parseReportFilters(searchParams);
  const report = await getFullReport(filters);
  const s = report.summary;
  const generated = new Date();

  // Two columns of figures rather than one long list — a summary that runs
  // half a page down reads as a receipt, not a report.
  const headline: [string, string][] = [
    ["Orders", String(s.orders)],
    ["Units sold", String(s.units)],
    ["Gross (items)", formatBDT(s.gross)],
    ["Discounts", `−${formatBDT(s.discount)}`],
    ["Courier charges", formatBDT(s.shipping)],
    ["Average order", formatBDT(s.averageOrder)],
  ];

  return (
    <div className="print-doc-page mx-auto max-w-[820px] px-8 py-8 text-ink">
      <div className="no-print mb-6 flex items-center justify-between gap-4 rounded-xl2 border border-border-soft bg-white px-5 py-4">
        <div>
          <p className="text-sm font-medium">Sales report</p>
          <p className="mt-0.5 text-xs text-ink/60">
            Print, then choose &quot;Save as PDF&quot; as the destination.
          </p>
        </div>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <article className="bg-white">
        <header className="mb-7 flex items-start justify-between gap-8 border-b-2 border-ink pb-4">
          <div>
            <h1 className="font-display text-[26px] font-semibold leading-none">{SITE_NAME}</h1>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-ink/60">Sales Report</p>
            {SUPPORT_EMAIL && <p className="mt-1 text-[10.5px] text-ink/50">{SUPPORT_EMAIL}</p>}
          </div>
          <div className="shrink-0 text-right text-[10.5px] leading-relaxed text-ink/60">
            <p>
              <span className="font-semibold text-ink">Generated</span><br />
              {generated.toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })}
              <br />
              {generated.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </header>

        {/* The filters belong on the page, not just in the URL — a printed
            report with no record of what it covers can't be trusted later. */}
        <p className="mb-7 rounded border border-ink/15 bg-ink/[0.03] px-3 py-2 text-[10.5px] leading-relaxed">
          <span className="font-semibold uppercase tracking-[0.08em]">Covering</span>
          <span className="mx-1.5 text-ink/30">|</span>
          {describe(filters)}
        </p>

        {s.orders === 0 ? (
          <p className="border border-dashed border-ink/20 py-16 text-center text-sm text-ink/50">
            No orders matched these filters.
          </p>
        ) : (
          <>
            <Section title="Summary">
              <div className="grid grid-cols-2 gap-x-10">
                {headline.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between border-b border-ink/[0.08] py-[5px] text-[11.5px]">
                    <span className="text-ink/70">{label}</span>
                    <span className="font-medium tabular-nums">{value}</span>
                  </div>
                ))}
              </div>

              {/* The two numbers that matter most, given prominence rather than
                  buried in a list of nine. */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="border-2 border-ink px-4 py-3">
                  <p className="text-[9.5px] uppercase tracking-[0.1em] text-ink/60">Net total</p>
                  <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">{formatBDT(s.net)}</p>
                  <p className="mt-0.5 text-[10px] text-ink/50">After discounts, including delivery</p>
                </div>
                <div className="border-2 border-ink px-4 py-3">
                  <p className="text-[9.5px] uppercase tracking-[0.1em] text-ink/60">Collected</p>
                  <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">{formatBDT(s.deliveredNet)}</p>
                  <p className="mt-0.5 text-[10px] text-ink/50">
                    {s.deliveredOrders} delivered order{s.deliveredOrders === 1 ? "" : "s"} — cash actually in
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Sales by day">
              <table className="w-full text-[11.5px]">
                <thead className="print:table-header-group">
                  <tr className="border-b border-ink/25 text-left text-[9.5px] uppercase tracking-[0.08em] text-ink/60">
                    <th className="pb-1.5 font-semibold">Date</th>
                    <th className="pb-1.5 text-right font-semibold">Orders</th>
                    <th className="pb-1.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byDay.map((d) => (
                    <tr key={d.date} className="border-b border-ink/[0.08] print:break-inside-avoid">
                      <td className="py-[5px]">
                        {new Date(d.date).toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-[5px] text-right tabular-nums">{d.orders}</td>
                      <td className="py-[5px] text-right font-medium tabular-nums">{formatBDT(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink font-semibold">
                    <td className="pt-1.5">{report.byDay.length} day{report.byDay.length === 1 ? "" : "s"}</td>
                    <td className="pt-1.5 text-right tabular-nums">{s.orders}</td>
                    <td className="pt-1.5 text-right tabular-nums">{formatBDT(s.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </Section>

            <Section title="Product sales"><Table rows={report.products} labelHeader="Product" /></Section>
            <Section title="Category sales"><Table rows={report.categories} labelHeader="Category" /></Section>
            <Section title="Brand sales"><Table rows={report.brands} labelHeader="Brand" /></Section>
            <Section title="Payment methods"><Table rows={report.payments} labelHeader="Method" showUnits={false} /></Section>
            <Section title="Order sources"><Table rows={report.sources} labelHeader="Source" showUnits={false} /></Section>

            <footer className="mt-8 border-t border-ink/15 pt-3 text-[9.5px] leading-relaxed text-ink/50">
              <p>
                Product, category and brand totals are line-item values and add up to the items subtotal, not the net —
                delivery and order-level discounts don&apos;t belong to any one product. Payment method and order source
                totals are whole orders and do add up to the net.
              </p>
              <p className="mt-1.5">{SITE_NAME} · Generated {generated.toLocaleString("en-BD")}</p>
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
