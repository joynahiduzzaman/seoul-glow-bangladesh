import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";
import { ShoppingBag, Wallet, Clock, PackageSearch, CalendarCheck, Search, Plus, FilePlus2, HandCoins } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import SortSelect from "@/components/admin/SortSelect";
import OrdersTableClient from "@/components/admin/OrdersTableClient";
import { revenueWhere, pipelineWhere } from "@/server/revenue";
import { parseOrderFilters, orderWhere, buildOrderQuery } from "@/server/order-filters";
import OrderFilterBar from "@/components/admin/OrderFilterBar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUS_TABS = ORDER_STATUSES;
const PAYMENT_FILTERS = [
  { value: "", label: "All Payments" },
  ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
];
const SORTS: Record<string, any> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  totalHigh: { total: "desc" },
  totalLow: { total: "asc" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    payment?: string;
    courier?: string;
    source?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  };
}) {
  // Parsed and turned into a Prisma filter by the shared module the reports
  // page also uses, so the two can never disagree about what a filter means.
  const filters = parseOrderFilters(searchParams);
  const activeStatus = filters.status;
  const q = filters.q;
  const sort = searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "newest";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = orderWhere(filters);

  const todayStart = startOfDay(new Date());

  const [
    orders,
    totalCount,
    statusCounts,
    totalOrders,
    todaysOrders,
    pendingCount,
    needsFulfillmentCount,
    draftCount,
    revenueAgg,
    pipelineAgg,
  ] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, user: { select: { name: true, email: true } }, assignedStaff: { select: { name: true } } },
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    // Tab counts respect every other filter. Showing a global "Delivered (412)"
    // beside a one-week date range invites you to click it and find four.
    Promise.all(
      STATUS_TABS.map((s) => prisma.order.count({ where: { ...orderWhere({ ...filters, status: "" }), status: s } }))
    ),
    prisma.order.count({ where: orderWhere({ ...filters, status: "" }) }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PACKED"] } } }),
    prisma.order.count({ where: { status: "DRAFT" } }),
    prisma.order.aggregate({ where: revenueWhere, _sum: { total: true } }),
    // Committed but not yet collected. On a cash-on-delivery shop, Total
    // Revenue counts delivered orders only — correct, but with everything
    // still in transit it reads as "nothing sold". This is the other half of
    // the picture, reported separately so the two are never added together.
    prisma.order.aggregate({ where: pipelineWhere, _sum: { total: true }, _count: true }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pipelineTotal = pipelineAgg._sum.total || 0;
  const pipelineCount = pipelineAgg._count || 0;
  const STATS = [
    { icon: ShoppingBag, label: "Total Orders", value: totalOrders, tone: "default" as const },
    {
      icon: Wallet,
      label: "Total Revenue",
      value: formatBDT(revenueAgg._sum.total || 0),
      tone: "success" as const,
      // Says out loud what the number counts, so BDT 0 reads as "nothing
      // delivered yet" rather than "nothing sold".
      hint: "Delivered orders only",
    },
    {
      icon: HandCoins,
      label: "Pending Collection",
      value: formatBDT(pipelineTotal),
      tone: pipelineTotal > 0 ? ("info" as const) : ("default" as const),
      // No href: "pending collection" spans four statuses and the tabs below
      // filter one at a time, so any link would land on a list totalling less
      // than the card claims.
      hint: pipelineCount === 1 ? "1 order awaiting delivery" : `${pipelineCount} orders awaiting delivery`,
    },
    { icon: Clock, label: "Pending", value: pendingCount, tone: "warning" as const },
    { icon: PackageSearch, label: "Needs Fulfillment", value: needsFulfillmentCount, tone: "default" as const },
    { icon: FilePlus2, label: "Draft Orders", value: draftCount, tone: draftCount > 0 ? "warning" as const : "default" as const },
    { icon: CalendarCheck, label: "Today's Orders", value: todaysOrders, tone: "success" as const },
  ];

  function buildQuery(overrides: Record<string, string | undefined>) {
    return buildOrderQuery({ ...filters, sort }, overrides);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold">Orders</h1>
        <Link href="/admin/orders/new" className="btn-primary !h-10 !px-5 !text-xs inline-flex items-center gap-1.5">
          <Plus size={14} /> New Order
        </Link>
      </div>

      {/* Dashboard cards */}
      {/* Column counts are set by what a five-figure currency value needs, not
          by how many cards there are. Seven across squeezed each to 125px at
          1280px, and the old 3-across tablet step gave 141px — both narrower
          than "BDT 35,790" renders, so the very number this row exists to show
          was the one getting cut off. Four is the most that fits. */}
      <div className="grid grid-cols-1 gap-4 mb-6 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} hint={s.hint} />
        ))}
      </div>

      <Suspense fallback={<div className="mb-4 h-[58px] rounded-xl2 border border-border-soft bg-white" />}>
        <OrderFilterBar
          q={filters.q}
          payment={filters.payment}
          courier={filters.courier}
          source={filters.source}
          from={filters.from}
          to={filters.to}
          active={filters.active}
        />
      </Suspense>

      {/* Status filter tabs + sort */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <Link
            href={buildQuery({ status: undefined })}
            className={`text-xs rounded-full px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              !activeStatus ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-beige/60"
            }`}
          >
            All ({totalOrders})
          </Link>
          {STATUS_TABS.map((s, i) => (
            <Link
              key={s}
              href={buildQuery({ status: s })}
              className={`text-xs rounded-full px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap ${
                activeStatus === s ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-beige/60"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()} ({statusCounts[i]})
            </Link>
          ))}
        </div>

        <div className="flex gap-2 lg:ml-auto flex-wrap">
          {/* Payment moved into the filter bar above, beside the other
              dropdowns — it was the odd one out over here. */}
          <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white w-24 h-9" />}>
            <SortSelect
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "totalHigh", label: "Total: High to Low" },
                { value: "totalLow", label: "Total: Low to High" },
              ]}
            />
          </Suspense>
        </div>
      </div>

      <OrdersTableClient orders={orders as any} />

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 text-sm text-ink/70">
        <p>
          Showing {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} orders
        </p>
        <div className="flex gap-2">
          <Link
            href={buildQuery({ page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={`rounded-full px-4 py-2 text-xs font-medium ${page <= 1 ? "bg-beige/60 text-ink/30 pointer-events-none" : "bg-white hover:bg-beige/60"}`}
          >
            Previous
          </Link>
          <Link
            href={buildQuery({ page: String(page + 1) })}
            aria-disabled={page >= totalPages}
            className={`rounded-full px-4 py-2 text-xs font-medium ${page >= totalPages ? "bg-beige/60 text-ink/30 pointer-events-none" : "bg-white hover:bg-beige/60"}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
