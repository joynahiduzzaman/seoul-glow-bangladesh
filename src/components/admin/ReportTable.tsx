import { formatBDT } from "@/lib/utils";
import type { BreakdownRow } from "@/server/reports";

/**
 * One breakdown table. Every section on the reports page is the same shape —
 * a label, some counts and a money total — so they share this rather than
 * seven near-identical tables.
 */
export default function ReportTable({
  title,
  rows,
  labelHeader,
  showUnits = true,
  emptyMessage = "Nothing in this range.",
  limit,
}: {
  title: string;
  rows: BreakdownRow[];
  labelHeader: string;
  showUnits?: boolean;
  emptyMessage?: string;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    // min-w-0: a grid item defaults to `min-width: auto`, so this card sized
    // itself to its widest table row instead of to the column, and pushed the
    // reports page 18px past a 390px phone. The inner overflow-x-auto is what
    // should absorb a wide table, and it can't while the card refuses to shrink.
    <section className="min-w-0 rounded-xl2 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {rows.length > 0 && <span className="text-xs text-ink/50">{rows.length} row{rows.length === 1 ? "" : "s"}</span>}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink/60">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/50">
                <th className="pb-2 pr-3">{labelHeader}</th>
                {showUnits && <th className="pb-2 px-3 text-right">Units</th>}
                <th className="pb-2 px-3 text-right">Orders</th>
                <th className="pb-2 pl-3 text-right">Total</th>
                {/* The share bar is decoration; on a phone the four real
                    columns already fill the width, and a fixed 96px extra is
                    what pushed the card past the viewport. */}
                <th className="hidden w-24 pb-2 pl-3 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                // A share bar rather than a chart: it reads at a glance and
                // costs nothing to render on the server.
                const share = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0;
                return (
                  <tr key={r.id} className="border-b border-ink/5 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-ink">{r.label}</span>
                      {r.sublabel && <span className="ml-1.5 text-xs text-ink/50">{r.sublabel}</span>}
                    </td>
                    {showUnits && <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">{r.units}</td>}
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">{r.orders}</td>
                    <td className="py-2.5 pl-3 text-right font-medium tabular-nums">{formatBDT(r.total)}</td>
                    <td className="hidden py-2.5 pl-3 sm:table-cell">
                      <span className="block h-1.5 w-full rounded-full bg-beige" aria-hidden="true">
                        <span className="block h-full rounded-full bg-rose-gold" style={{ width: `${Math.max(share, 2)}%` }} />
                      </span>
                      <span className="sr-only">{share.toFixed(1)}% of the total</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {limit && rows.length > limit && (
            <p className="mt-3 text-xs text-ink/50">
              Showing the top {limit} of {rows.length}. Every row is in the CSV and Excel exports.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
