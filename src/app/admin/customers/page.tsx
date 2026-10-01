import Link from "next/link";
import { Search, Users, UserCheck, Wallet, Repeat } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import StatCard from "@/components/admin/StatCard";
import { listCustomers, CUSTOMERS_PAGE_SIZE, type CustomerSort } from "@/server/customers";

export const dynamic = "force-dynamic";

const SORTS: { key: CustomerSort; label: string }[] = [
  { key: "profit", label: "Most profitable" },
  { key: "spend", label: "Biggest spenders" },
  { key: "orders", label: "Most orders" },
  { key: "recent", label: "Recently ordered" },
  { key: "name", label: "Name" },
];

function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const sort = (SORTS.find((s) => s.key === searchParams.sort)?.key ?? "profit") as CustomerSort;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { rows, total, totals } = await listCustomers({ q, sort, page });
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, sort, page: String(page), ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "profit") && !(k === "page" && v === "1")) params.set(k, v);
    });
    const qs = params.toString();
    return `/admin/customers${qs ? `?${qs}` : ""}`;
  }

  // Measured across every buyer, not just the page, or the figure would change
  // as you paged through.
  const repeatRate = totals.buyers > 0 ? (totals.repeatBuyers / totals.buyers) * 100 : 0;
  const averageValue = totals.buyers > 0 ? totals.spend / totals.buyers : 0;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-ink/70">
          Everyone who has bought, grouped by phone number &mdash; most people here check out as guests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Buyers" value={totals.buyers} tone="violet" hint="People who have actually ordered" />
        <StatCard
          icon={Repeat}
          label="Came back"
          value={totals.repeatBuyers}
          tone="success"
          hint={`${repeatRate.toFixed(0)}% ordered more than once`}
        />
        <StatCard
          icon={Wallet}
          label="Lifetime spend"
          value={formatBDT(totals.spend)}
          tone="info"
          hint={`${formatBDT(averageValue)} average per buyer`}
        />
        <StatCard
          icon={UserCheck}
          label="Registered accounts"
          value={totals.registeredAccounts}
          tone="warning"
          hint="Most people check out as guests"
        />
      </div>

      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name, phone or email…"
            className="w-full rounded-full border border-ink/10 py-2.5 pl-9 pr-4 text-sm"
          />
          {sort !== "profit" && <input type="hidden" name="sort" value={sort} />}
        </form>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={buildHref({ sort: s.key, page: "1" })}
              aria-current={s.key === sort ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                s.key === sort ? "bg-ink text-cream" : "border border-border-soft bg-white text-ink/70 hover:bg-cream"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl2 border border-border-soft bg-white p-12 text-center shadow-soft">
          <h2 className="font-display text-xl">{q ? `No buyer matches “${q}”` : "Nobody has bought yet"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            {q ? "Try a different name, phone number or email." : "Buyers appear here once their first order is delivered."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-cream/50 text-left text-[11px] uppercase tracking-[0.12em] text-ink/60">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">Spent</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="px-4 py-3 text-right font-semibold">Last order</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border-soft/60 transition-colors last:border-0 hover:bg-cream/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        {c.name}
                        {c.hasAccount && (
                          <span className="ml-2 rounded-full bg-badge-coupon/10 px-1.5 py-0.5 text-[10px] font-medium text-badge-coupon">
                            account
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink/55">
                        {c.phone || "no phone"}
                        {c.email && ` · ${c.email}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink/70">
                      {c.orderCount}
                      {c.orderCount > 1 && (
                        <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          repeat
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBDT(c.spend)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        c.profit > 0 ? "text-success" : c.profit < 0 ? "text-badge-sale" : "text-ink/40"
                      }`}
                    >
                      {formatBDT(c.profit)}
                      {c.unitsMissingCost > 0 && (
                        <span
                          title={`${c.unitsMissingCost} unit(s) bought have no cost price recorded, so this reads high`}
                          className="ml-1 text-gold"
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-ink/60">
                      {formatDay(c.lastOrderAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(c.phone || c.name)}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-gold-text transition-colors hover:bg-cream"
                      >
                        View orders
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink/70">
          <p>
            Showing {(page - 1) * CUSTOMERS_PAGE_SIZE + 1}&ndash;{Math.min(page * CUSTOMERS_PAGE_SIZE, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildHref({ page: String(page - 1) })}
              aria-disabled={page <= 1}
              className={`rounded-full px-4 py-2 text-xs font-medium ${
                page <= 1 ? "pointer-events-none bg-beige/60 text-ink/30" : "bg-white hover:bg-beige/60"
              }`}
            >
              Previous
            </Link>
            <Link
              href={buildHref({ page: String(page + 1) })}
              aria-disabled={page >= totalPages}
              className={`rounded-full px-4 py-2 text-xs font-medium ${
                page >= totalPages ? "pointer-events-none bg-beige/60 text-ink/30" : "bg-white hover:bg-beige/60"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink/55">
        Buyers are grouped by phone number, since most orders here are guest checkouts with no account behind
        them — the same number in any format (+880…, 01…, 1…) counts as one person. Spend and profit count
        delivered orders only, so a cancelled order never inflates anyone&apos;s standing. Profit is each
        buyer&apos;s gross contribution: courier bills and ads belong to the shop, not to one person, so they
        aren&apos;t deducted here.
      </p>
    </div>
  );
}
