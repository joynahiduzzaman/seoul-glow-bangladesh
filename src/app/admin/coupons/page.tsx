import { prisma } from "@/server/db";
import Link from "next/link";
import { Suspense } from "react";
import { formatBDT } from "@/lib/utils";
import { Ticket, TicketX, Percent, Wallet, Search } from "lucide-react";
import CouponsTableClient from "@/components/admin/CouponsTableClient";
import SortSelect from "@/components/admin/SortSelect";
import { revenueWhere } from "@/server/revenue";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
  { key: "expired", label: "Expired" },
];

const SORTS: Record<string, any> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  mostUsed: { usedCount: "desc" },
  expiry: { expiresAt: "asc" },
};

export default async function AdminCouponsPage({ searchParams }: { searchParams: { q?: string; status?: string; sort?: string } }) {
  const q = searchParams.q?.trim() || "";
  const status = searchParams.status || "all";
  const sort = searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "newest";
  const now = new Date();

  const where: any = {};
  if (q) where.code = { contains: q.toUpperCase(), mode: "insensitive" };
  if (status === "active") where.AND = [{ active: true }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }];
  if (status === "disabled") where.AND = [{ active: false }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }];
  if (status === "expired") where.expiresAt = { lte: now };

  const [coupons, activeCount, expiredCount, usageAgg, discountAgg] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy: SORTS[sort] }),
    prisma.coupon.count({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.coupon.count({ where: { expiresAt: { lte: now } } }),
    prisma.coupon.aggregate({ _sum: { usedCount: true } }),
    prisma.order.aggregate({ _sum: { discount: true }, where: { ...revenueWhere, couponCode: { not: null } } }),
  ]);

  const STATS = [
    { icon: Ticket, label: "Active Coupons", value: activeCount, tone: "success" as const },
    { icon: TicketX, label: "Expired Coupons", value: expiredCount, tone: "danger" as const },
    { icon: Percent, label: "Total Uses", value: usageAgg._sum.usedCount || 0, tone: "default" as const },
    { icon: Wallet, label: "Total Discount Given", value: formatBDT(discountAgg._sum.discount || 0), tone: "warning" as const },
  ];

  const TONE_CLASSES: Record<string, string> = {
    default: "bg-rose-gold/10 text-rose-gold",
    success: "bg-success/10 text-success",
    danger: "bg-badge-sale/10 text-badge-sale",
    warning: "bg-gold/15 text-gold",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold">Coupons</h1>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STATS.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="bg-white rounded-xl2 p-5 shadow-soft">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-3 ${TONE_CLASSES[tone]}`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-ink/70 uppercase tracking-wide mb-1">{label}</p>
            <p className="font-display text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + sort */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <form className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input type="text" name="q" defaultValue={q} placeholder="Search by code…" className="w-full rounded-full border border-ink/10 pl-9 pr-4 py-2.5 text-sm" />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        </form>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/coupons?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}${sort !== "newest" ? `&sort=${sort}` : ""}`}
              className={`text-xs rounded-full px-4 py-2.5 font-medium transition-colors whitespace-nowrap ${
                status === f.key ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-beige/60"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white lg:ml-auto w-24 h-9" />}>
          <SortSelect
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "mostUsed", label: "Most Used" },
              { value: "expiry", label: "Expiry Date" },
            ]}
          />
        </Suspense>
      </div>

      <CouponsTableClient coupons={coupons} />
    </div>
  );
}
