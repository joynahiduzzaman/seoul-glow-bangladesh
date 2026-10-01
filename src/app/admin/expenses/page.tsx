import Link from "next/link";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import { Receipt, Wallet, Boxes, TrendingDown } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import ExpensesTableClient, { type ExpenseRow } from "@/components/admin/ExpensesTableClient";
import {
  getExpenseBreakdown,
  resolvePeriod,
  dayRange,
  PERIODS,
} from "@/server/finance";
import { expenseCategoryLabel } from "@/lib/expense-categories";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: { period?: string; category?: string };
}) {
  const period = resolvePeriod(searchParams.period);
  const { start, end } = dayRange(period.from, period.to);
  const activeCategory = searchParams.category;

  const [rows, breakdown] = await Promise.all([
    prisma.expense.findMany({
      where: {
        spentAt: { gte: start, lte: end },
        ...(activeCategory ? { category: activeCategory } : {}),
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: { recordedBy: { select: { name: true } } },
    }),
    getExpenseBreakdown(period.from, period.to),
  ]);

  const expenses: ExpenseRow[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    amount: e.amount,
    spentAt: e.spentAt.toISOString(),
    vendor: e.vendor,
    reference: e.reference,
    paidVia: e.paidVia,
    note: e.note,
    recordedByName: e.recordedBy?.name ?? null,
  }));

  // Breakdown is always for the whole period, never narrowed by the category
  // filter — otherwise clicking a category would make its own card read as 100%
  // of spending.
  const operatingTotal = breakdown.filter((b) => b.operating).reduce((s, b) => s + b.total, 0);
  const stockTotal = breakdown.filter((b) => !b.operating).reduce((s, b) => s + b.total, 0);
  const biggest = breakdown.find((b) => b.operating);
  const maxTotal = Math.max(...breakdown.map((b) => b.total), 1);

  const periodHref = (p: string) =>
    `/admin/expenses?period=${p}${activeCategory ? `&category=${activeCategory}` : ""}`;
  const categoryHref = (c: string | null) =>
    `/admin/expenses?period=${period.value}${c ? `&category=${c}` : ""}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-ink/70">
            Every taka the shop spends, so the profit figure means something.
          </p>
        </div>
        <nav aria-label="Reporting period" className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={periodHref(p.value)}
              aria-current={p.value === period.value ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                p.value === period.value
                  ? "bg-ink text-cream"
                  : "border border-border-soft bg-white text-ink/70 hover:bg-cream"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingDown}
          label="Operating expenses"
          value={formatBDT(operatingTotal)}
          tone="danger"
          hint={`Subtracted from profit · ${period.label.toLowerCase()}`}
        />
        <StatCard
          icon={Boxes}
          label="Stock purchased"
          value={formatBDT(stockTotal)}
          tone="info"
          hint="Cash out, counted as goods sell"
        />
        <StatCard
          icon={Wallet}
          label="Total cash out"
          value={formatBDT(operatingTotal + stockTotal)}
          tone="violet"
          hint="Both of the above together"
        />
        <StatCard
          icon={Receipt}
          label="Biggest cost"
          value={biggest ? expenseCategoryLabel(biggest.category) : "—"}
          tone="warning"
          hint={biggest ? formatBDT(biggest.total) : "No operating expenses yet"}
        />
      </div>

      {breakdown.length > 0 && (
        <section className="rounded-xl2 border border-border-soft bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Where the money went</h2>
            {activeCategory && (
              <Link href={categoryHref(null)} className="text-xs text-rose-gold-text hover:underline">
                Clear filter
              </Link>
            )}
          </div>
          <ul className="space-y-2.5">
            {breakdown.map((b) => {
              const isActive = activeCategory === b.category;
              return (
                <li key={b.category}>
                  <Link
                    href={categoryHref(isActive ? null : b.category)}
                    className={`group block rounded-lg px-3 py-2 transition-colors ${
                      isActive ? "bg-cream" : "hover:bg-cream/60"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {expenseCategoryLabel(b.category)}
                        {!b.operating && (
                          <span className="ml-2 text-[10px] font-normal text-ink/45">not in profit</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink/70">
                        {formatBDT(b.total)}
                        <span className="ml-2 text-xs text-ink/45">
                          {b.count} item{b.count === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                    {/* Bar width is relative to the largest category, not to the
                        total, so small categories stay visible instead of
                        collapsing into a hairline. */}
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div
                        className={`h-full rounded-full ${b.operating ? "bg-rose-gold" : "bg-badge-coupon"}`}
                        style={{ width: `${Math.max((b.total / maxTotal) * 100, 2)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <ExpensesTableClient expenses={expenses} />
      </section>
    </div>
  );
}
