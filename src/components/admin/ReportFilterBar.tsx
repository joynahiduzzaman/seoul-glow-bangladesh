"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { X, FileSpreadsheet, FileText, Printer, Table2 } from "lucide-react";
import { ORDER_STATUSES, PAYMENT_STATUSES, ORDER_SOURCES } from "@/lib/order-status";
import { COURIERS, COURIER_LABELS } from "@/lib/shipping";

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export interface PickerOption { id: string; name: string }

/** Ranges people actually ask for, so the common case isn't two date pickers. */
function presetRange(days: number | "month" | "all"): { from: string; to: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (days === "all") return { from: "", to: "" };
  if (days === "month") {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: iso(from), to: iso(today) };
}

export default function ReportFilterBar({
  filters,
  products,
  categories,
  brands,
}: {
  filters: Record<string, string> & { active: boolean };
  products: PickerOption[];
  categories: PickerOption[];
  brands: PickerOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/reports?${qs}` : "/admin/reports");
  }

  const exportHref = (format: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", format);
    return `/api/admin/reports/export?${params.toString()}`;
  };
  const printHref = () => {
    const qs = searchParams.toString();
    return qs ? `/admin/reports/print?${qs}` : "/admin/reports/print";
  };

  const select = "rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs text-ink";

  return (
    <div className="mb-6 space-y-3 rounded-xl2 border border-border-soft bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Range</span>
        {([["Last 7 days", 7], ["Last 30 days", 30], ["This month", "month"], ["All time", "all"]] as const).map(([label, v]) => (
          <button
            key={label}
            type="button"
            onClick={() => apply(presetRange(v as any))}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-rose-gold hover:text-rose-gold-text"
          >
            {label}
          </button>
        ))}
        <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => apply({ from: e.target.value })} aria-label="From date" className={select} />
        <span className="text-xs text-ink/40" aria-hidden="true">–</span>
        <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => apply({ to: e.target.value })} aria-label="To date" className={select} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
        <select value={filters.status} onChange={(e) => apply({ status: e.target.value })} aria-label="Order status" className={select}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{title(s)}</option>)}
        </select>
        <select value={filters.payment} onChange={(e) => apply({ payment: e.target.value })} aria-label="Payment status" className={select}>
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{title(p)}</option>)}
        </select>
        <select value={filters.courier} onChange={(e) => apply({ courier: e.target.value })} aria-label="Courier" className={select}>
          <option value="">All couriers</option>
          <option value="NONE">No courier yet</option>
          {COURIERS.map((c) => <option key={c} value={c}>{COURIER_LABELS[c]}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => apply({ source: e.target.value })} aria-label="Order source" className={select}>
          <option value="">All sources</option>
          {ORDER_SOURCES.map((s) => <option key={s} value={s}>{title(s)}</option>)}
        </select>
        <select value={filters.productId} onChange={(e) => apply({ productId: e.target.value })} aria-label="Product" className={`${select} max-w-[190px]`}>
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.categoryId} onChange={(e) => apply({ categoryId: e.target.value })} aria-label="Category" className={select}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.brandId} onChange={(e) => apply({ brandId: e.target.value })} aria-label="Brand" className={select}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {filters.active && (
          <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-rose-gold hover:text-rose-gold-text">
            <X size={13} /> Clear filters
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Export</span>
        {/* Plain links, not fetch(): the browser handles the download, and the
            file covers the whole filtered set rather than this page of it. */}
        <a href={exportHref("csv")} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60">
          <FileText size={13} /> CSV
        </a>
        <a href={exportHref("xlsx")} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60">
          <FileSpreadsheet size={13} /> Excel
        </a>
        <a href={printHref()} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60">
          <Printer size={13} /> PDF
        </a>
        <a href={exportHref("orders-csv")} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60">
          <Table2 size={13} /> Order rows (CSV)
        </a>
      </div>
    </div>
  );
}
