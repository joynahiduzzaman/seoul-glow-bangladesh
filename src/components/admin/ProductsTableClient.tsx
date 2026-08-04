"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { formatBDT, parseJsonArray } from "@/lib/utils";
import { Star, X, Zap } from "lucide-react";
import ProductActionsMenu from "./ProductActionsMenu";
import ProductDrawer, { DrawerState } from "./ProductDrawer";
import ConfirmDialog from "./ConfirmDialog";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  discountPercent: number;
  stock: number;
  status: string;
  isFeatured: boolean;
  images: string;
  brand: { id: string; name: string };
  category: { id: string; name: string };
}

/** Shared pill shape for every table badge, so status/brand/category/stock all
 * share one silhouette and only differ by colour. */
const PILL = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ring-1";

function ProductStatusBadge({ stock, status }: { stock: number; status: string }) {
  // Stock is checked before status on purpose: a product can be ACTIVE but
  // unsellable at 0 stock, and "Out of Stock" is the more urgent fact.
  if (stock === 0) {
    return (
      <span className={`${PILL} bg-badge-sale/10 text-badge-sale ring-badge-sale/20`}>
        <span className="h-1.5 w-1.5 rounded-full bg-badge-sale" /> Out of Stock
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className={`${PILL} bg-gold/15 text-gold ring-gold/25`}>
        <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Draft
      </span>
    );
  }
  return (
    <span className={`${PILL} bg-success/10 text-success ring-success/20`}>
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
    </span>
  );
}

function BrandBadge({ name }: { name: string }) {
  return <span className={`${PILL} bg-badge-onetwo/[0.08] text-badge-onetwo ring-badge-onetwo/20`}>{name}</span>;
}

function CategoryBadge({ name }: { name: string }) {
  return <span className={`${PILL} bg-badge-coupon/[0.08] text-badge-coupon ring-badge-coupon/20`}>{name}</span>;
}

/** Stock reads as a coloured chip with a tiny fill bar, so "how much is left"
 * is legible at a glance rather than a bare number that needs interpreting. */
function StockBadge({ stock }: { stock: number }) {
  const tone =
    stock === 0
      ? { text: "text-badge-sale", bg: "bg-badge-sale/10", ring: "ring-badge-sale/20", bar: "bg-badge-sale" }
      : stock < 10
      ? { text: "text-gold", bg: "bg-gold/15", ring: "ring-gold/25", bar: "bg-gold" }
      : { text: "text-success", bg: "bg-success/10", ring: "ring-success/20", bar: "bg-success" };
  // Bar saturates at 30 units — beyond that "plenty in stock" is the only
  // signal that matters, and a full bar communicates it clearly.
  const pct = Math.min(100, (stock / 30) * 100);

  return (
    <span className="inline-flex flex-col gap-1">
      <span className={`${PILL} ${tone.bg} ${tone.text} ${tone.ring} tabular-nums`}>{stock} in stock</span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.07]">
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(pct, stock > 0 ? 6 : 0)}%` }} />
      </span>
    </span>
  );
}

export default function ProductsTableClient({
  products,
  brands,
  categories,
}: {
  products: Product[];
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"changeCategory" | "changeBrand" | null>(null);

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDuplicate(p: Product) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product duplicated as a draft");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate product");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product deleted");
      setDeleting(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(action: "delete" | "activate" | "draft" | "changeCategory" | "changeBrand", value?: string) {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || `Updated ${data.count} product(s)`);
      setSelected(new Set());
      setBulkTarget(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Deliberately labelled "Quick add" rather than "Add Product": this opens
          the side drawer for a fast inline create, while the page header's
          "Add Product" goes to the full form. Two entry points with the same
          label read as a duplicated button. */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setDrawer({ mode: "create" })}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border-soft bg-white px-4 text-xs font-semibold text-ink/70 shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-0.5 hover:border-rose-gold/40 hover:text-rose-gold-text hover:shadow-e2"
        >
          <Zap size={14} /> Quick add
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-ink text-white rounded-xl px-4 py-3">
          <span className="text-xs font-medium mr-2">{selected.size} selected</span>
          <button disabled={busy} onClick={() => runBulk("activate")} className="text-xs rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition-colors">
            Activate
          </button>
          <button disabled={busy} onClick={() => runBulk("draft")} className="text-xs rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition-colors">
            Set to Draft
          </button>
          <button disabled={busy} onClick={() => setBulkTarget("changeCategory")} className="text-xs rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition-colors">
            Change Category
          </button>
          <button disabled={busy} onClick={() => setBulkTarget("changeBrand")} className="text-xs rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition-colors">
            Change Brand
          </button>
          <button disabled={busy} onClick={() => runBulk("delete")} className="text-xs rounded-full bg-badge-sale/80 hover:bg-badge-sale px-3 py-1.5 transition-colors">
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} aria-label="Clear selection" className="ml-auto text-white/50 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bulk category/brand picker */}
      {bulkTarget && (
        <div className="flex items-center gap-2 mb-4 bg-white rounded-xl px-4 py-3 shadow-soft">
          <span className="text-xs text-ink/70 shrink-0">{bulkTarget === "changeCategory" ? "Move to category:" : "Move to brand:"}</span>
          <select
            onChange={(e) => e.target.value && runBulk(bulkTarget, e.target.value)}
            defaultValue=""
            className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-xs"
          >
            <option value="" disabled>Select…</option>
            {(bulkTarget === "changeCategory" ? categories : brands).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button onClick={() => setBulkTarget(null)} className="text-xs text-ink/70 hover:text-ink">Cancel</button>
        </div>
      )}

      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="p-4">Product</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const thumb = parseJsonArray(p.images)[0];
              return (
                <tr key={p.id} className={`border-b border-ink/5 ${selected.has(p.id) ? "bg-soft-pink/10" : ""}`}>
                  <td className="p-4">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.name}`} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3 max-w-xs">
                      <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-beige shrink-0 ring-1 ring-ink/5">
                        {thumb && <Image src={thumb} alt={p.name} fill sizes="56px" className="object-cover" />}
                        {p.isFeatured && (
                          <span className="absolute top-0.5 left-0.5 bg-ink/80 rounded-full p-0.5" title="Featured">
                            <Star size={9} className="fill-rose-gold-light text-rose-gold-light" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        {p.sku && <p className="text-[11px] text-ink/35 font-mono">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><BrandBadge name={p.brand.name} /></td>
                  <td className="p-4"><CategoryBadge name={p.category.name} /></td>
                  <td className="p-4 font-medium tabular-nums">{formatBDT(p.price)}</td>
                  <td className="p-4 w-32"><StockBadge stock={p.stock} /></td>
                  <td className="p-4"><ProductStatusBadge stock={p.stock} status={p.status} /></td>
                  <td className="p-4">
                    <ProductActionsMenu
                      slug={p.slug}
                      onEdit={() => setDrawer({ mode: "edit", productId: p.id })}
                      onDuplicate={() => handleDuplicate(p)}
                      onDelete={() => setDeleting(p)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm text-ink/70 mb-4">No products match this view.</p>
          </div>
        )}
      </div>

      <ProductDrawer state={drawer} onClose={() => setDrawer(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this product?"
        message={deleting ? `"${deleting.name}" will be permanently removed. This can't be undone.` : ""}
        confirmLabel="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
