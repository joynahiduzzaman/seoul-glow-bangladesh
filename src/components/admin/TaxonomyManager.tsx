"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Pencil, X, Loader2, Search, ExternalLink,
  ArrowUpDown, LayoutGrid, Rows3, PackageOpen,
} from "lucide-react";
import TaxonomyImageField from "./TaxonomyImageField";

export interface TaxonomyRow {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  /** Brands only — stored in Brand.story. */
  description?: string | null;
  /** Brands only. */
  country?: string | null;
  productCount: number;
  createdAt: string;
}

type SortKey = "name" | "products" | "newest";

/**
 * Catalogue taxonomy manager, shared by Categories and Brands.
 *
 * Replaces a list whose edit mode exposed only name and slug — there was no
 * image control at all once a row existed, which is why images could not be
 * changed after creation. Editing now happens in a drawer holding every field
 * the schema actually stores.
 *
 * A card grid rather than a table: these records are mostly *pictures*, and a
 * table row shrinks the one attribute an admin is here to judge. A compact list
 * view is available for scanning many at once.
 */
export default function TaxonomyManager({
  kind,
  rows,
}: {
  kind: "categories" | "brands";
  rows: TaxonomyRow[];
}) {
  const router = useRouter();
  const label = kind === "categories" ? "category" : "brand";
  const Label = kind === "categories" ? "Category" : "Brand";
  const imageLabel = kind === "categories" ? "Category image" : "Brand logo";

  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const blank = { id: "", name: "", slug: "", image: "", description: "", country: "" };
  const [draft, setDraft] = useState<typeof blank | null>(null);
  const isNew = draft?.id === "";

  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDraft(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [draft]);

  // ── Filtering, sorting ────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
    if (onlyEmpty) list = list.filter((r) => r.productCount === 0);
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "products") sorted.sort((a, b) => b.productCount - a.productCount);
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [rows, query, sort, onlyEmpty]);

  async function call(url: string, init: RequestInit, okMessage?: string) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    if (okMessage) toast.success(okMessage);
    router.refresh();
    return data;
  }

  const imageKey = kind === "categories" ? "image" : "logo";

  async function save() {
    if (!draft) return;
    if (draft.name.trim().length < 2) return toast.error("Enter a name");
    setBusy("save");
    try {
      const payload: Record<string, unknown> = { name: draft.name, [imageKey]: draft.image };
      if (!isNew) payload.slug = draft.slug;
      if (kind === "brands") {
        payload.story = draft.description;
        if (draft.country) payload.country = draft.country;
      }
      await call(
        isNew ? `/api/admin/${kind}` : `/api/admin/${kind}/${draft.id}`,
        { method: isNew ? "POST" : "PATCH", body: JSON.stringify(payload) },
        isNew ? `${Label} created` : `${Label} updated`
      );
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: TaxonomyRow) {
    if (row.productCount > 0) {
      return toast.error(
        `${row.productCount} product${row.productCount === 1 ? " still uses" : "s still use"} “${row.name}”. Move ${row.productCount === 1 ? "it" : "them"} to another ${label} first.`
      );
    }
    if (!confirm(`Delete the ${label} “${row.name}”? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      await call(`/api/admin/${kind}/${row.id}`, { method: "DELETE" }, `${Label} deleted`);
      setSelected((s) => { const n = new Set(s); n.delete(row.id); return n; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(null);
    }
  }

  async function bulkDelete() {
    const chosen = rows.filter((r) => selected.has(r.id));
    const blocked = chosen.filter((r) => r.productCount > 0);
    const deletable = chosen.filter((r) => r.productCount === 0);

    if (blocked.length) {
      toast.error(`${blocked.length} still ${blocked.length === 1 ? "has" : "have"} products and will be skipped.`);
    }
    if (!deletable.length) return;
    if (!confirm(`Delete ${deletable.length} ${deletable.length === 1 ? label : kind}? This cannot be undone.`)) return;

    setBusy("bulk");
    let done = 0;
    for (const row of deletable) {
      try {
        const res = await fetch(`/api/admin/${kind}/${row.id}`, { method: "DELETE" });
        if (res.ok) done++;
      } catch { /* counted as not done */ }
    }
    toast.success(`Deleted ${done} ${done === 1 ? label : kind}`);
    setSelected(new Set());
    setBusy(null);
    router.refresh();
  }

  const totalProducts = rows.reduce((n, r) => n + r.productCount, 0);
  const emptyCount = rows.filter((r) => r.productCount === 0).length;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{kind === "categories" ? "Categories" : "Brands"}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {rows.length} total · {totalProducts} product{totalProducts === 1 ? "" : "s"} assigned
            {emptyCount > 0 && ` · ${emptyCount} empty`}
          </p>
        </div>
        <button onClick={() => setDraft({ ...blank })} className="btn-primary">
          <Plus size={16} /> Add {label}
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind} by name or web address…`}
            aria-label={`Search ${kind}`}
            className="field !py-2.5 !pl-10"
          />
        </div>

        <label className="sr-only" htmlFor="tax-sort">Sort</label>
        <div className="relative">
          <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden="true" />
          <select
            id="tax-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field !py-2.5 !pl-9 !pr-8 text-sm"
          >
            <option value="name">Name (A–Z)</option>
            <option value="products">Most products</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        <button
          onClick={() => setOnlyEmpty((v) => !v)}
          aria-pressed={onlyEmpty}
          className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
            onlyEmpty ? "border-rose-gold bg-rose-gold/10 text-rose-gold-text" : "border-border-soft text-ink/70 hover:border-ink/20"
          }`}
        >
          Empty only
        </button>

        <div className="flex overflow-hidden rounded-xl border border-border-soft">
          {([["grid", LayoutGrid], ["list", Rows3]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              aria-label={`${mode} view`}
              aria-pressed={view === mode}
              className={`px-3 py-2.5 transition-colors ${view === mode ? "bg-ink text-cream" : "text-ink/50 hover:bg-beige"}`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk action bar, only once something is selected ────────────── */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-gold/30 bg-rose-gold/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-ink/60 hover:underline">Clear</button>
          <button
            onClick={bulkDelete}
            disabled={busy === "bulk"}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy === "bulk" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete selected
          </button>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="card-surface px-6 py-16 text-center">
          <PackageOpen size={28} className="mx-auto mb-3 text-ink/25" aria-hidden="true" />
          <p className="font-medium">{rows.length === 0 ? `No ${kind} yet` : "Nothing matches"}</p>
          <p className="mt-1 text-sm text-ink/70">
            {rows.length === 0 ? `Products need a ${label}, so add at least one.` : "Try a different search or clear the filter."}
          </p>
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((row) => (
            <li key={row.id} className="card-surface group relative overflow-hidden">
              <label className="absolute left-3 top-3 z-10 cursor-pointer">
                <span className="sr-only">Select {row.name}</span>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(row.id) : n.delete(row.id); return n; })}
                  className="h-4 w-4 rounded border-ink/25 accent-rose-gold"
                />
              </label>

              <button
                type="button"
                onClick={() => setDraft({
                  id: row.id, name: row.name, slug: row.slug, image: row.image || "",
                  description: row.description || "", country: row.country || "",
                })}
                className="block w-full text-left"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-beige">
                  {row.image ? (
                    <Image src={row.image} alt="" fill sizes="(max-width:640px) 50vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-ink/30">No image</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all group-hover:bg-ink/40 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-e2">
                      <Pencil size={12} /> Edit
                    </span>
                  </span>
                </div>

                <div className="p-3.5">
                  <p className="truncate font-medium leading-tight">{row.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink/45">/{row.slug}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <StatusPill count={row.productCount} />
                    <span className="text-[11px] text-ink/40">
                      {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex border-t border-border-soft">
                <a
                  href={kind === "categories" ? `/shop?category=${row.slug}` : `/brands/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-ink/60 transition-colors hover:bg-beige hover:text-ink"
                >
                  <ExternalLink size={12} /> View
                </a>
                <button
                  onClick={() => remove(row)}
                  disabled={busy === row.id}
                  aria-label={row.productCount > 0 ? `Cannot delete ${row.name} — ${row.productCount} products use it` : `Delete ${row.name}`}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-l border-border-soft py-2.5 text-[11px] font-medium transition-colors ${
                    row.productCount > 0 ? "cursor-not-allowed text-ink/25" : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  {busy === row.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.id} className="card-surface flex flex-wrap items-center gap-4 p-3.5">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(row.id) : n.delete(row.id); return n; })}
                aria-label={`Select ${row.name}`}
                className="h-4 w-4 shrink-0 rounded border-ink/25 accent-rose-gold"
              />
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-beige">
                {row.image ? <Image src={row.image} alt="" fill sizes="48px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.name}</p>
                <p className="truncate text-[11px] text-ink/45">/{row.slug}</p>
              </div>
              <StatusPill count={row.productCount} />
              <span className="hidden text-[11px] text-ink/40 sm:block">
                {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <div className="flex items-center gap-1.5">
                <IconButton label={`Edit ${row.name}`} onClick={() => setDraft({
                  id: row.id, name: row.name, slug: row.slug, image: row.image || "",
                  description: row.description || "", country: row.country || "",
                })}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton label={`Delete ${row.name}`} onClick={() => remove(row)} disabled={busy === row.id} danger dimmed={row.productCount > 0}>
                  {busy === row.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Edit / create drawer ───────────────────────────────────────── */}
      {draft && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={isNew ? `New ${label}` : `Edit ${draft.name}`}>
          {/* The scrim is not a button: it would otherwise announce a second
              control named "Close" alongside the one in the header, which reads
              as two different actions. Keyboard users get Escape and the header
              button, so nothing is lost by hiding it from assistive tech. */}
          <div aria-hidden="true" onClick={() => setDraft(null)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-e4">
            <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
              <h2 className="font-display text-lg">{isNew ? `New ${label}` : `Edit ${label}`}</h2>
              <button onClick={() => setDraft(null)} aria-label="Close editor" className="text-ink/50 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              <TaxonomyImageField
                label={imageLabel}
                value={draft.image}
                onChange={(url) => setDraft((d) => (d ? { ...d, image: url } : d))}
                disabled={busy === "save"}
              />

              <div>
                <label className="field-label" htmlFor="tax-name">Name</label>
                <input
                  id="tax-name"
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  placeholder={kind === "categories" ? "e.g. Sunscreen" : "e.g. COSRX"}
                  className="field"
                />
              </div>

              {!isNew && (
                <div>
                  <label className="field-label" htmlFor="tax-slug">Web address</label>
                  <input
                    id="tax-slug"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => (d ? { ...d, slug: e.target.value } : d))}
                    className="field text-sm"
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink/50">
                    Changing this breaks existing links to this {label}. Renaming above leaves it alone.
                  </p>
                </div>
              )}

              {kind === "brands" && (
                <>
                  <div>
                    <label className="field-label" htmlFor="tax-desc">Description</label>
                    <textarea
                      id="tax-desc"
                      rows={4}
                      value={draft.description}
                      onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                      placeholder="Shown on the brand page."
                      className="field resize-none"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="tax-country">Country</label>
                    <input
                      id="tax-country"
                      value={draft.country}
                      onChange={(e) => setDraft((d) => (d ? { ...d, country: e.target.value } : d))}
                      placeholder="South Korea"
                      className="field"
                    />
                  </div>
                </>
              )}

              {isNew && (
                <p className="rounded-lg bg-beige/60 px-4 py-3 text-[11px] leading-relaxed text-ink/70">
                  The web address is generated from the name and stays fixed if you rename later, so existing links keep working.
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-border-soft bg-white px-6 py-4">
              <button onClick={save} disabled={busy === "save"} className="btn-primary flex-1">
                {busy === "save" && <Loader2 size={15} className="animate-spin" />}
                {isNew ? `Create ${label}` : "Save changes"}
              </button>
              <button onClick={() => setDraft(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Derived from product count — neither table has a status column, and adding
 *  one would mean a schema change this redesign does not need. */
function StatusPill({ count }: { count: number }) {
  return count > 0 ? (
    <span className="rounded-full bg-badge-new-text/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-badge-new-text">
      {count} product{count === 1 ? "" : "s"}
    </span>
  ) : (
    <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/45">Empty</span>
  );
}

function IconButton({
  label, onClick, disabled, danger, dimmed, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-ink/60 hover:bg-beige hover:text-ink"
      } ${dimmed ? "opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
