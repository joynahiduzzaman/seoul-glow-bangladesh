"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { PAYMENT_STATUSES, ORDER_SOURCES } from "@/lib/order-status";
import { COURIERS, COURIER_LABELS } from "@/lib/shipping";

const SOURCE_LABELS: Record<string, string> = {
  ONLINE: "Online storefront",
  PHONE: "Phone order",
  MESSENGER: "Messenger",
  WALK_IN: "Walk-in",
};

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * Search, payment, courier, source and date range in one row.
 *
 * Each control submits on change rather than hiding behind an Apply button —
 * with one exception: the text search, which would fire a request per keystroke
 * and is left on Enter. Status stays where it was, as the tab strip above.
 */
export default function OrderFilterBar({
  q,
  payment,
  courier,
  source,
  from,
  to,
  active,
}: {
  q: string;
  payment: string;
  courier: string;
  source: string;
  from: string;
  to: string;
  active: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Any filter change invalidates the page number — staying on page 4 of a
    // narrower result set lands on an empty screen.
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  }

  const select = "rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs text-ink";

  return (
    <div className="mb-4 rounded-xl2 border border-border-soft bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-[200px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", (new FormData(e.currentTarget).get("q") as string)?.trim() || "");
          }}
        >
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Order #, name, phone, or email…"
            aria-label="Search orders"
            className="w-full rounded-lg border border-ink/10 py-2 pl-8 pr-3 text-xs"
          />
        </form>

        <select value={payment} onChange={(e) => setParam("payment", e.target.value)} aria-label="Payment status" className={select}>
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((p) => (
            <option key={p} value={p}>{title(p)}</option>
          ))}
        </select>

        <select value={courier} onChange={(e) => setParam("courier", e.target.value)} aria-label="Courier" className={select}>
          <option value="">All couriers</option>
          <option value="NONE">Awaiting courier</option>
          {COURIERS.map((c) => (
            <option key={c} value={c}>{COURIER_LABELS[c]}</option>
          ))}
        </select>

        <select value={source} onChange={(e) => setParam("source", e.target.value)} aria-label="Order source" className={select}>
          <option value="">All sources</option>
          {ORDER_SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s] || title(s)}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-xs text-ink/60">
          <SlidersHorizontal size={13} className="shrink-0" />
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setParam("from", e.target.value)}
            aria-label="Orders from date"
            className={select}
          />
          <span aria-hidden="true">–</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setParam("to", e.target.value)}
            aria-label="Orders to date"
            className={select}
          />
        </div>

        {active && (
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-rose-gold hover:text-rose-gold-text"
          >
            <X size={13} /> Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
