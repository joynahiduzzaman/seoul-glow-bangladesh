"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, Check, X, Loader2, Package } from "lucide-react";
import SingleImageUpload from "./SingleImageUpload";

export interface TaxonomyRow {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  productCount: number;
}

/**
 * Shared editor for the two catalogue taxonomies, Category and Brand.
 *
 * They behave identically — create, rename, re-image, delete, all constrained by
 * how many products depend on the row — so one component serves both rather than
 * two that drift apart.
 *
 * Editing is inline. A modal for two fields costs a round of focus management
 * and hides the rest of the list, which is exactly the context an admin needs
 * while renaming one of sixteen similar things.
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

  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", image: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", slug: "", image: "" });

  async function call(url: string, init: RequestInit, okMessage?: string) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    if (okMessage) toast.success(okMessage);
    router.refresh();
    return data;
  }

  const imageKey = kind === "categories" ? "image" : "logo";

  async function handleAdd() {
    if (draft.name.trim().length < 2) return toast.error("Enter a name");
    setBusy("add");
    try {
      await call(
        `/api/admin/${kind}`,
        { method: "POST", body: JSON.stringify({ name: draft.name, [imageKey]: draft.image }) },
        `${Label} created`
      );
      setDraft({ name: "", image: "" });
      setAdding(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleSave(id: string) {
    setBusy(id);
    try {
      await call(
        `/api/admin/${kind}/${id}`,
        { method: "PATCH", body: JSON.stringify({ name: edit.name, slug: edit.slug, [imageKey]: edit.image }) },
        `${Label} updated`
      );
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(row: TaxonomyRow) {
    // The server refuses anyway, but stopping here avoids a pointless round trip
    // and explains the situation before anything is attempted.
    if (row.productCount > 0) {
      return toast.error(
        `${row.productCount} product${row.productCount === 1 ? "" : "s"} still use "${row.name}". Move them first.`
      );
    }
    if (!confirm(`Delete the ${label} "${row.name}"? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      await call(`/api/admin/${kind}/${row.id}`, { method: "DELETE" }, `${Label} deleted`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{kind === "categories" ? "Categories" : "Brands"}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {rows.length} {rows.length === 1 ? label : kind} · used across {rows.reduce((n, r) => n + r.productCount, 0)} product
            {rows.reduce((n, r) => n + r.productCount, 0) === 1 ? "" : "s"}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={16} /> Add {label}
          </button>
        )}
      </div>

      {adding && (
        <div className="card-surface mb-8 p-6">
          <h2 className="mb-4 font-display text-lg">New {label}</h2>
          <div className="grid gap-5 md:grid-cols-[200px_1fr]">
            <SingleImageUpload
              label={kind === "categories" ? "Image (optional)" : "Logo (optional)"}
              value={draft.image}
              onChange={(url) => setDraft((d) => ({ ...d, image: url }))}
              aspect={1}
            />
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="tax-name">Name</label>
                <input
                  id="tax-name"
                  autoFocus
                  placeholder={kind === "categories" ? "e.g. Sunscreen" : "e.g. COSRX"}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="field"
                />
                <p className="mt-1.5 text-xs text-ink/50">
                  The web address is generated from the name, and stays fixed if you rename it later.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={busy === "add"} className="btn-primary">
                  {busy === "add" && <Loader2 size={15} className="animate-spin" />} Create {label}
                </button>
                <button onClick={() => { setAdding(false); setDraft({ name: "", image: "" }); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card-surface px-6 py-16 text-center">
          <Package size={28} className="mx-auto mb-3 text-ink/30" aria-hidden="true" />
          <p className="font-medium">No {kind} yet</p>
          <p className="mt-1 text-sm text-ink/70">Products need a {label}, so add at least one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <li key={row.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-beige">
                  {(isEditing ? edit.image : row.image) ? (
                    <Image src={(isEditing ? edit.image : row.image) as string} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-ink/30">—</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={edit.name}
                      onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                      className="field !py-2"
                      aria-label={`${Label} name`}
                    />
                    <input
                      value={edit.slug}
                      onChange={(e) => setEdit((s) => ({ ...s, slug: e.target.value }))}
                      className="field !py-2 text-xs"
                      aria-label="Web address"
                      placeholder="web-address"
                    />
                    <p className="text-[11px] text-ink/50">
                      Changing the web address breaks any existing link to this {label}.
                    </p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{row.name}</p>
                    <p className="truncate text-xs text-ink/50">
                      /{kind === "categories" ? "shop?category=" : "brands/"}
                      {row.slug}
                      {" · "}
                      {row.productCount} product{row.productCount === 1 ? "" : "s"}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <IconButton label="Save changes" onClick={() => handleSave(row.id)} disabled={busy === row.id}>
                        {busy === row.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      </IconButton>
                      <IconButton label="Cancel editing" onClick={() => setEditingId(null)}>
                        <X size={15} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        label={`Edit ${row.name}`}
                        onClick={() => {
                          setEditingId(row.id);
                          setEdit({ name: row.name, slug: row.slug, image: row.image || "" });
                        }}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        label={row.productCount > 0 ? `Cannot delete — ${row.productCount} products use it` : `Delete ${row.name}`}
                        onClick={() => handleDelete(row)}
                        disabled={busy === row.id}
                        danger
                        dimmed={row.productCount > 0}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  dimmed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** In-use rows keep a clickable delete so the reason can be explained. */
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
