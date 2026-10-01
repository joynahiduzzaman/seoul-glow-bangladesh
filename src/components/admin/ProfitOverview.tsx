import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Plus } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import type { ProfitSummary } from "@/server/finance";

/**
 * The P&L block: what came in, what it cost, and what the shop actually kept.
 *
 * Net profit is the hero rather than revenue, because revenue was already on
 * this dashboard and was never the question an owner is really asking. The
 * supporting figures are laid out in the order the subtraction happens, so the
 * card reads as the arithmetic it is instead of four unrelated numbers.
 */

function Line({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "negative" | "positive";
}) {
  const valueTone =
    tone === "negative" ? "text-badge-sale" : tone === "positive" ? "text-success" : "text-ink";
  return (
    <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-ink/55">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold tabular-nums leading-tight sm:text-xl ${valueTone}`}>
        {tone === "negative" && value !== formatBDT(0) ? `− ${value}` : value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink/55">{hint}</p>}
    </div>
  );
}

export default function ProfitOverview({
  summary,
  periodLabel,
  profitChange,
}: {
  summary: ProfitSummary;
  periodLabel: string;
  /** Percent change in net profit vs the previous month; null when there is no
   *  meaningful comparison (no prior revenue). */
  profitChange: number | null;
}) {
  const profitable = summary.netProfit >= 0;

  // The split bar only makes sense when money actually came in; with no revenue
  // there is nothing to divide and the bar would render as an empty rail.
  const hasRevenue = summary.netRevenue > 0;
  const share = (part: number) => (hasRevenue ? Math.max((part / summary.netRevenue) * 100, 0) : 0);
  const cogsShare = share(summary.cogs);
  const expenseShare = share(summary.operatingExpenses);
  // Clamped so a loss-making period doesn't push the bar past 100% and overflow.
  const profitShare = Math.max(100 - cogsShare - expenseShare, 0);

  const TrendIcon = profitChange != null && profitChange >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <section
      aria-label="Profit and loss"
      className="overflow-hidden rounded-xl2 border border-border-soft/80 bg-white shadow-e1"
    >
      {/* Hero: the answer to "how much did we actually make" */}
      <div
        className={`relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7 ${
          profitable
            ? "bg-gradient-to-br from-success/[0.11] via-white to-white"
            : "bg-gradient-to-br from-badge-sale/[0.10] via-white to-white"
        }`}
      >
        <span
          className={`absolute inset-y-0 left-0 w-1 ${profitable ? "bg-success" : "bg-badge-sale"}`}
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink/60">
              Net profit · {periodLabel}
            </p>
            <p
              className={`mt-1.5 font-display text-[2.1rem] font-semibold leading-none tabular-nums sm:text-[2.6rem] ${
                profitable ? "text-success" : "text-badge-sale"
              }`}
            >
              {formatBDT(summary.netProfit)}
            </p>
            <p className="mt-2 text-xs text-ink/65">
              {hasRevenue ? (
                <>
                  {summary.netMargin.toFixed(1)}% margin · {formatBDT(summary.profitPerOrder)} per order
                </>
              ) : (
                "No delivered orders in this period yet"
              )}
            </p>
          </div>

          {profitChange != null && (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                profitChange >= 0 ? "bg-success/10 text-success" : "bg-badge-sale/10 text-badge-sale"
              }`}
            >
              <TrendIcon size={14} strokeWidth={2.5} />
              {Math.abs(profitChange).toFixed(0)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* How revenue divides up */}
      {hasRevenue && (
        <div className="px-5 pb-1 sm:px-7">
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.06]"
            role="img"
            aria-label={`Of ${formatBDT(summary.netRevenue)} revenue, ${formatBDT(
              summary.cogs
            )} is product cost, ${formatBDT(summary.operatingExpenses)} is expenses, and ${formatBDT(
              summary.netProfit
            )} is profit`}
          >
            <div className="bg-gold" style={{ width: `${cogsShare}%` }} />
            <div className="bg-badge-sale" style={{ width: `${expenseShare}%` }} />
            <div className={profitable ? "bg-success" : "bg-ink/15"} style={{ width: `${profitShare}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" /> Product cost
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-badge-sale" aria-hidden="true" /> Expenses
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${profitable ? "bg-success" : "bg-ink/15"}`}
                aria-hidden="true"
              />{" "}
              Profit
            </span>
          </div>
        </div>
      )}

      {/* The arithmetic, in the order it happens */}
      <div className="mt-4 flex flex-wrap divide-ink/[0.07] border-t border-border-soft/70 sm:divide-x">
        <Line
          label="Revenue"
          value={formatBDT(summary.netRevenue)}
          hint={`${summary.orderCount} delivered · ${summary.unitsSold} units`}
        />
        <Line
          label="Product cost"
          value={formatBDT(summary.cogs)}
          hint="What the goods cost you"
          tone="negative"
        />
        <Line
          label="Gross profit"
          value={formatBDT(summary.grossProfit)}
          hint={hasRevenue ? `${summary.grossMargin.toFixed(1)}% margin` : undefined}
        />
        <Line
          label="Expenses"
          value={formatBDT(summary.operatingExpenses)}
          hint="Courier, ads, salary…"
          tone="negative"
        />
      </div>

      {/* Caveats and cash-out notes, only when they apply */}
      {(summary.unitsMissingCost > 0 || summary.nonOperatingSpend > 0) && (
        <div className="space-y-2 border-t border-border-soft/70 bg-cream/40 px-5 py-3 sm:px-7">
          {summary.unitsMissingCost > 0 && (
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink/70">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-gold" />
              <span>
                {summary.unitsMissingCost} sold unit{summary.unitsMissingCost === 1 ? " has" : "s have"} no
                cost price recorded, so product cost is understated and profit here is higher than reality.{" "}
                <Link href="/admin/products" className="text-rose-gold-text underline">
                  Add cost prices
                </Link>{" "}
                to fix it.
              </span>
            </p>
          )}
          {summary.nonOperatingSpend > 0 && (
            <p className="text-[11.5px] leading-relaxed text-ink/70">
              Plus {formatBDT(summary.nonOperatingSpend)} spent restocking. That is cash out, but it is not
              subtracted here — each item&apos;s cost is counted above as it sells.
            </p>
          )}
        </div>
      )}

      {summary.operatingExpenses === 0 && summary.nonOperatingSpend === 0 && (
        <div className="border-t border-border-soft/70 bg-cream/40 px-5 py-3.5 sm:px-7">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/70">
            <span>No expenses recorded for this period, so this is gross profit, not true profit.</span>
            <Link
              href="/admin/expenses"
              className="inline-flex items-center gap-1 font-medium text-rose-gold-text hover:underline"
            >
              <Plus size={12} />
              Add your costs
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
