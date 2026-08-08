"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, ExternalLink, RotateCcw } from "lucide-react";
import SingleImageUpload from "./SingleImageUpload";
import ConfirmDialog from "./ConfirmDialog";
import type { FieldGroup, FieldDef, ContentValues } from "@/lib/site-content";

/**
 * One editor for every content page and for the global business info.
 *
 * Entirely driven by the `groups` field definitions handed in by the server, so
 * adding an editable field anywhere on the site needs no change here — declare
 * it in src/lib/site-content.ts and it appears.
 */
export default function ContentEditor({
  target,
  title,
  description,
  livePath,
  groups,
  initialValues,
}: {
  target: string;
  title: string;
  description: string;
  livePath?: string;
  groups: FieldGroup[];
  initialValues: ContentValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ContentValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dirty, setDirty] = useState(false);

  function setField(key: string, value: ContentValues[string]) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function getText(key: string) {
    const v = values[key];
    return typeof v === "string" ? v : "";
  }
  function getRows(key: string) {
    const v = values[key];
    return Array.isArray(v) ? v : [];
  }

  function updateRow(key: string, index: number, col: string, val: string) {
    const next = getRows(key).map((row, i) => (i === index ? { ...row, [col]: val } : row));
    setField(key, next);
  }
  function addRow(field: FieldDef) {
    const blank = Object.fromEntries((field.itemFields || []).map((f) => [f.key, ""]));
    setField(field.key, [...getRows(field.key), blank]);
  }
  function removeRow(key: string, index: number) {
    setField(key, getRows(key).filter((_, i) => i !== index));
  }
  function moveRow(key: string, from: number, to: number) {
    const list = getRows(key);
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setField(key, next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Saved — live on the site now");
      setDirty(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/content?target=${encodeURIComponent(target)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Restored to the original content");
      setConfirmReset(false);
      router.refresh();
      // Reload so the form repopulates from the freshly-restored defaults.
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="max-w-3xl pb-28">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink/70">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {livePath && (
            <Link
              href={livePath}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3.5 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-ink/20 hover:text-ink"
            >
              <ExternalLink size={13} /> View live
            </Link>
          )}
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3.5 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-badge-sale/40 hover:text-badge-sale"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.title} className="rounded-xl2 bg-white p-6 shadow-e1">
            <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
            {group.description && <p className="mt-1 text-xs text-ink/70">{group.description}</p>}

            <div className="mt-5 space-y-5">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-[13px] font-medium text-ink">{field.label}</label>
                  {field.hint && <p className="mb-1.5 text-[11px] leading-snug text-ink/70">{field.hint}</p>}

                  {field.type === "text" && (
                    <input
                      value={getText(field.key)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="field"
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      rows={3}
                      value={getText(field.key)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="field resize-y"
                    />
                  )}

                  {field.type === "image" && (
                    // Capped width: at full form width a 16:9 preview is ~400px
                    // tall and pushes every field below it off screen.
                    <div className="max-w-xs">
                      <SingleImageUpload
                        label=""
                        value={getText(field.key)}
                        onChange={(url) => setField(field.key, url)}
                        aspect={16 / 9}
                        maxDimension={2400}
                      />
                    </div>
                  )}

                  {field.type === "list" && (
                    <div className="space-y-3">
                      {getRows(field.key).map((row, i) => (
                        <div key={i} className="rounded-xl border border-border-soft bg-beige/25 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/70">
                              {i + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveRow(field.key, i, i - 1)}
                                disabled={i === 0}
                                aria-label="Move up"
                                className="rounded-md p-1 text-ink/70 hover:bg-white hover:text-ink disabled:opacity-25"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRow(field.key, i, i + 1)}
                                disabled={i === getRows(field.key).length - 1}
                                aria-label="Move down"
                                className="rounded-md p-1 text-ink/70 hover:bg-white hover:text-ink disabled:opacity-25"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRow(field.key, i)}
                                aria-label="Remove"
                                className="rounded-md p-1 text-ink/70 hover:bg-white hover:text-badge-sale"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {(field.itemFields || []).map((col) => (
                              <div key={col.key}>
                                <label className="mb-1 block text-[11px] font-medium text-ink/70">{col.label}</label>
                                {col.type === "textarea" ? (
                                  <textarea
                                    // Four rather than two: rows carry real prose
                                    // now (an article body, not just an FAQ
                                    // answer), and the box is still resizable.
                                    rows={4}
                                    value={row[col.key] || ""}
                                    onChange={(e) => updateRow(field.key, i, col.key, e.target.value)}
                                    className="field resize-y !py-2 !text-[13px]"
                                  />
                                ) : col.type === "image" ? (
                                  // Capped like the top-level image field above.
                                  // Uncapped, one row's photo preview filled the
                                  // form and buried every field under it.
                                  <div className="max-w-xs">
                                    <SingleImageUpload
                                      label=""
                                      value={row[col.key] || ""}
                                      onChange={(url) => updateRow(field.key, i, col.key, url)}
                                      aspect={16 / 9}
                                      maxDimension={2400}
                                    />
                                  </div>
                                ) : (
                                  <input
                                    value={row[col.key] || ""}
                                    onChange={(e) => updateRow(field.key, i, col.key, e.target.value)}
                                    className="field !py-2 !text-[13px]"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addRow(field)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-ink/20 px-4 py-2.5 text-xs font-medium text-ink/70 transition-colors hover:border-rose-gold hover:text-rose-gold-text"
                      >
                        <Plus size={13} /> {field.itemLabel || "Add item"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky save bar — the forms are long, and having to scroll back to the
          top to save is exactly how edits get lost. */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-soft bg-cream/95 px-5 py-3.5 backdrop-blur lg:left-[var(--admin-sidebar-w,260px)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-xs text-ink/70">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <button onClick={handleSave} disabled={saving || !dirty} className="btn-primary !h-11 px-8 disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restore original content?"
        message="Every change you've made to this page will be discarded and the original wording restored. This can't be undone."
        confirmLabel={resetting ? "Restoring…" : "Restore original"}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
