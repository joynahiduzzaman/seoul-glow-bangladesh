import { Suspense } from "react";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import { ShoppingBag, Package, Wallet, HandCoins, TicketPercent, Truck } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import SimpleBarChart from "@/components/admin/SimpleBarChart";
import ReportFilterBar from "@/components/admin/ReportFilterBar";
import ReportTable from "@/components/admin/ReportTable";
import { parseReportFilters, getFullReport, type ReportFilterParams } from "@/server/reports";

export const dynamic = "force-dynamic";

/** How many rows each breakdown shows on screen. Exports carry all of them. */
const ON_SCREEN_ROWS = 15;

export default async function AdminReportsPage({ searchParams }: { searchParams: ReportFilterParams }) {
  const filters = parseReportFilters(searchParams);

  const [report, products, categories, brands] = await Promise.all([
    getFullReport(filters),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const s = report.summary;

  // The last 14 days of the filtered range, so the chart stays readable on a
  // wide range instead of compressing a year into slivers.
  const chartDays = report.byDay.slice(-14);
  const chartData = chartDays.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-BD", { day: "numeric", month: "short" }),
    value: Math.round(d.total),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every figure below reflects the filters you set, and so does every export.
        </p>
      </div>

      <Suspense fallback={<div className="mb-6 h-44 rounded-xl2 border border-border-soft bg-white" />}>
        <ReportFilterBar
          filters={filters as unknown as Record<string, string> & { active: boolean }}
          products={products}
          categories={categories}
          brands={brands}
        />
      </Suspense>

      <div className="mb-6 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={ShoppingBag} label="Orders" value={s.orders} tone="default" hint="In this range" />
        <StatCard icon={Package} label="Units sold" value={s.units} tone="info" hint="Across all line items" />
        <StatCard icon={Wallet} label="Net total" value={formatBDT(s.net)} tone="violet" hint="After discounts, with delivery" />
        <StatCard icon={HandCoins} label="Collected" value={formatBDT(s.deliveredNet)} tone="success" hint={`${s.deliveredOrders} delivered`} />
        <StatCard icon={TicketPercent} label="Discounts" value={formatBDT(s.discount)} tone="warning" hint="Coupons and manual" />
        <StatCard icon={Truck} label="Avg. order" value={formatBDT(s.averageOrder)} tone="default" hint="Net ÷ orders" />
      </div>

      {s.orders === 0 ? (
        <div className="rounded-xl2 bg-white p-12 text-center shadow-soft">
          <h2 className="font-display text-xl">No orders in this range</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            Nothing matched these filters. Widen the date range, or clear the filters to see everything.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl2 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Sales by day</h2>
              <span className="text-xs text-ink/50">
                {report.byDay.length} day{report.byDay.length === 1 ? "" : "s"} with orders
                {report.byDay.length > chartDays.length && ` · charting the last ${chartDays.length}`}
              </span>
            </div>
            <SimpleBarChart data={chartData} />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportTable title="Product sales" labelHeader="Product" rows={report.products} limit={ON_SCREEN_ROWS} />
            <ReportTable title="Category sales" labelHeader="Category" rows={report.categories} limit={ON_SCREEN_ROWS} />
            <ReportTable title="Brand sales" labelHeader="Brand" rows={report.brands} limit={ON_SCREEN_ROWS} />
            <div className="grid gap-6">
              <ReportTable title="Payment methods" labelHeader="Method" rows={report.payments} showUnits={false} />
              <ReportTable title="Order sources" labelHeader="Source" rows={report.sources} showUnits={false} />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink/50">
            Product, category and brand totals are line-item values, so they add up to the items subtotal rather than the
            net total — delivery and order-level discounts don&apos;t belong to any one product. Payment and source
            totals are whole orders, and do add up to the net.
          </p>
        </div>
      )}
    </div>
  );
}
