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
  searchParams: { q?: string; status?: string; payment?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const activeStatus = searchParams.status && STATUS_TABS.includes(searchParams.status as any) ? searchParams.status : "";
  const activePayment = searchParams.payment && PAYMENT_FILTERS.some((p) => p.value === searchParams.payment) ? searchParams.payment : "";
  const sort = searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "newest";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: any = {};
  if (activeStatus) where.status = activeStatus;
  if (activePayment) where.paymentStatus = activePayment;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { shippingName: { contains: q, mode: "insensitive" } },
      { shippingPhone: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

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
    Promise.all(STATUS_TABS.map((s) => prisma.order.count({ where: { status: s } }))),
    prisma.order.count(),
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
    const params = new URLSearchParams();
    const merged = { q, status: activeStatus, payment: activePayment, sort, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "newest")) params.set(k, v);
    });
    return `/admin/orders?${params.toString()}`;
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

      {/* Search */}
      <form className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search order #, name, phone, or email…"
          className="w-full rounded-full border border-ink/10 pl-9 pr-4 py-2.5 text-sm"
        />
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        {activePayment && <input type="hidden" name="payment" value={activePayment} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
      </form>

      {/* Status filter tabs + payment filter + sort */}
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
          <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white w-28 h-9" />}>
            <SortSelect paramName="payment" options={PAYMENT_FILTERS} />
          </Suspense>
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
