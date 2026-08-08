"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Undo2, Redo2, History, RotateCcw, Loader2, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import HeroSlidesEditor from "./HeroSlidesEditor";
import SingleImageUpload from "./SingleImageUpload";
import ImageUploadField from "./ImageUploadField";
import DesignFields from "./homepage/DesignFields";
import ScheduleFields from "./homepage/ScheduleFields";
import SectionPreview from "./homepage/SectionPreview";
import MultiSelectPicker from "./homepage/MultiSelectPicker";
import ConfirmDialog from "./ConfirmDialog";
import { usePickerOptions } from "@/lib/admin/use-picker-options";
import { useUndoRedo } from "@/lib/admin/use-undo-redo";
import { definitionFor } from "@/lib/homepage-sections";
import { normalizeDesignSettings } from "@/lib/section-design";
import { HeroCarouselSettings } from "@/lib/hero-slides";

export interface SectionRow {
  id: string;
  sectionKey: string;
  title: string;
  settings: string;
  enabled: boolean;
  status: string;
  publishAt: string | null;
  unpublishAt: string | null;
}

interface Revision {
  id: string;
  title: string;
  settings: string;
  status: string;
  publishAt: string | null;
  unpublishAt: string | null;
  createdAt: string;
}

interface DraftState {
  title: string;
  settings: Record<string, any>;
  status: string;
  publishAt: string | null;
  unpublishAt: string | null;
}

type Tab = "content" | "design" | "schedule" | "history" | "preview";
const AUTOSAVE_DELAY_MS = 1500;

const PRODUCT_LIMIT_LABEL: Record<string, string> = {
  featuredProducts: "Product limit",
  flashSale: "Product limit",
  bestSellers: "Product limit",
  newArrivals: "Product limit",
  trending: "Product limit",
};

function draftFrom(section: SectionRow): DraftState {
  return {
    title: section.title,
    settings: JSON.parse(section.settings || "{}"),
    status: section.status,
    publishAt: section.publishAt,
    unpublishAt: section.unpublishAt,
  };
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function SectionSettingsModal({
  section,
  onClose,
  onSaved,
}: {
  section: SectionRow | null;
  onClose: () => void;
  onSaved?: (updated: Partial<SectionRow> & { id: string }) => void;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Revision | null>(null);

  const initial = section ? draftFrom(section) : { title: "", settings: {}, status: "PUBLISHED", publishAt: null, unpublishAt: null };
  const { present: draft, set: setDraft, undo, redo, reset: resetDraft, canUndo, canRedo } = useUndoRedo<DraftState>(initial);
  const lastSavedRef = useRef(JSON.stringify(initial));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true); // don't autosave on first mount, only on actual edits

  const def = section ? definitionFor(section.sectionKey) : undefined;
  const design = normalizeDesignSettings(draft.settings.design);
  const isDirty = JSON.stringify(draft) !== lastSavedRef.current;

  const pickerKind =
    draft.settings.mode === "manual"
      ? def?.hasProductSelection
        ? "products"
        : def?.hasCategorySelection
        ? "categories"
        : def?.hasBrandSelection
        ? "brands"
        : def?.hasBlogSelection
        ? "posts"
        : null
      : null;
  const { options: pickerOptions, loading: pickerLoading } = usePickerOptions(pickerKind as any);

  async function persist(opts: { silentSuccess?: boolean } = {}): Promise<boolean> {
    if (!section) return false;
    const snapshot = JSON.stringify(draft);
    if (snapshot === lastSavedRef.current) return true;
    if (!draft.title.trim()) return false; // invalid — let the field's own validation surface this
    setAutosaveStatus("saving");
    try {
      const res = await fetch(`/api/admin/homepage-sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      lastSavedRef.current = snapshot;
      setAutosaveStatus("saved");
      // Keeps the builder's own row list in sync (title/badge/etc) without a full
      // server round-trip — router.refresh() is deliberately NOT called here: this
      // runs on every silent autosave tick (every ~1.5s while editing), and
      // refreshing the server component tree that often re-renders this modal's
      // parent, which was causing the whole modal to unmount mid-edit. A full
      // refresh only happens on the explicit Save/close paths below.
      onSaved?.({
        id: section.id,
        title: draft.title,
        settings: JSON.stringify(draft.settings),
        status: draft.status,
        publishAt: draft.publishAt,
        unpublishAt: draft.unpublishAt,
      });
      if (!opts.silentSuccess) toast.success("Section updated — live on the homepage now");
      return true;
    } catch (err: any) {
      setAutosaveStatus("error");
      toast.error(err.message || "Failed to save — your changes are still here, we'll retry");
      return false;
    }
  }

  // Auto-save: debounced ~1.5s after the last edit. Skipped while the title is
  // empty (mid-edit, about to fail validation) so it doesn't spam error toasts.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!draft.title.trim()) {
      setAutosaveStatus("idle");
      return;
    }
    setAutosaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist({ silentSuccess: true });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Warn on tab close/refresh while there's a change autosave hasn't caught up
  // with yet (or that failed to save) — the only window where work could be lost.
  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcuts: Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (!section || !def) return null;

  function set(key: string, value: any) {
    setDraft((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
  }
  function setDesignPatch(patch: Partial<typeof design>) {
    setDraft((d) => ({ ...d, settings: { ...d.settings, design: { ...normalizeDesignSettings(d.settings.design), ...patch } } }));
  }
  function setTitle(value: string) {
    setDraft((d) => ({ ...d, title: value }));
  }

  const selectionKey = def.hasProductSelection ? "productIds" : def.hasCategorySelection ? "categoryIds" : def.hasBrandSelection ? "brandIds" : null;
  const isHero = section.sectionKey === "hero";
  const isCustomBanner = section.sectionKey.startsWith("customBanner:");

  async function attemptClose() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (isDirty) {
      setClosing(true);
      const ok = await persist({ silentSuccess: true });
      setClosing(false);
      if (!ok) return; // keep the modal open — don't lose the edit silently
    }
    router.refresh();
    onClose();
  }

  async function handleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const ok = await persist();
    if (ok) {
      router.refresh();
      onClose();
    }
  }

  async function loadRevisions() {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/admin/homepage-sections/${section!.id}/revisions`);
      const data = await res.json();
      setRevisions(data.revisions || []);
    } catch {
      toast.error("Failed to load revision history");
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  }

  async function restoreRevision(revision: Revision) {
    setRestoringId(revision.id);
    try {
      const res = await fetch(`/api/admin/homepage-sections/${section!.id}/revisions/${revision.id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const restored: DraftState = {
        title: data.section.title,
        settings: JSON.parse(data.section.settings || "{}"),
        status: data.section.status,
        publishAt: data.section.publishAt,
        unpublishAt: data.section.unpublishAt,
      };
      resetDraft(restored);
      lastSavedRef.current = JSON.stringify(restored);
      setAutosaveStatus("saved");
      onSaved?.({ id: section!.id, ...data.section, settings: data.section.settings });
      toast.success("Revision restored");
      setConfirmRestore(null);
      loadRevisions();
      setTab("content");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore revision");
    } finally {
      setRestoringId(null);
    }
  }

  const AUTOSAVE_INDICATOR: Record<typeof autosaveStatus, { label: string; icon: React.ReactNode }> = {
    idle: { label: "", icon: null },
    pending: { label: "Unsaved changes", icon: <AlertCircle size={12} /> },
    saving: { label: "Saving…", icon: <Loader2 size={12} className="animate-spin" /> },
    saved: { label: "All changes saved", icon: <Check size={12} /> },
    error: { label: "Couldn't save — will retry", icon: <AlertCircle size={12} className="text-red-500" /> },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={attemptClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-border-soft shrink-0 gap-3">
          <h3 className="font-display text-lg truncate">Edit: {section.title}</h3>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-lg text-ink/70 hover:text-ink hover:bg-beige/60 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded-lg text-ink/70 hover:text-ink hover:bg-beige/60 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Redo2 size={15} />
              </button>
            </div>
            {AUTOSAVE_INDICATOR[autosaveStatus].label && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink/70">
                {AUTOSAVE_INDICATOR[autosaveStatus].icon}
                {AUTOSAVE_INDICATOR[autosaveStatus].label}
              </span>
            )}
            <button onClick={attemptClose} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={18} /></button>
          </div>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-border-soft shrink-0">
          {(["content", "design", "schedule", "history", "preview"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "history" && revisions === null) loadRevisions();
              }}
              className={`px-4 py-2.5 text-xs font-medium capitalize rounded-t-lg transition-colors ${
                tab === t ? "bg-beige/60 text-ink" : "text-ink/70 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {tab === "content" && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">Admin label</label>
                <input value={draft.title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                <p className="text-[11px] text-ink/35 mt-1">Only shown here in the builder — not on the live site.</p>
              </div>

              {isHero && (
                <HeroSlidesEditor rawSettings={draft.settings} onChange={(carousel: HeroCarouselSettings) => setDraft((d) => ({ ...d, settings: carousel }))} />
              )}

              {def.hasTitleSubtitle && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Title</label>
                    <input
                      placeholder="Leave blank for the site default"
                      value={draft.settings.title || ""}
                      onChange={(e) => set("title", e.target.value)}
                      className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Subtitle</label>
                    <input
                      placeholder="Leave blank for the site default"
                      value={draft.settings.subtitle || ""}
                      onChange={(e) => set("subtitle", e.target.value)}
                      className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              )}

              {def.hasCategorySelection && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Grid columns</label>
                    <select value={draft.settings.columns ?? 6} onChange={(e) => set("columns", Number(e.target.value))} className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm">
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Category limit</label>
                    <input type="number" min={1} max={12} value={draft.settings.limit ?? 6} onChange={(e) => set("limit", Number(e.target.value))} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  </div>
                </div>
              )}

              {def.hasBrandSelection && (
                <div>
                  <label className="block text-[11px] text-ink/70 mb-1.5">Brand limit</label>
                  <input type="number" min={1} max={12} value={draft.settings.limit ?? 6} onChange={(e) => set("limit", Number(e.target.value))} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                </div>
              )}

              {def.hasProductSelection && (
                <div>
                  <label className="block text-[11px] text-ink/70 mb-1.5">{PRODUCT_LIMIT_LABEL[section.sectionKey] || "Product limit"}</label>
                  <input type="number" min={1} max={20} value={draft.settings.productLimit ?? 8} onChange={(e) => set("productLimit", Number(e.target.value))} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                </div>
              )}

              {def.hasBlogSelection && (
                <div>
                  <label className="block text-[11px] text-ink/70 mb-1.5">Post limit</label>
                  <input type="number" min={1} max={9} value={draft.settings.postLimit ?? 3} onChange={(e) => set("postLimit", Number(e.target.value))} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                </div>
              )}

              {(def.hasProductSelection || def.hasCategorySelection || def.hasBrandSelection || def.hasBlogSelection) && (
                <div>
                  <label className="block text-[11px] text-ink/70 mb-1.5">Selection mode</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => set("mode", "auto")}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                        (draft.settings.mode || "auto") === "auto" ? "border-rose-gold bg-rose-gold/10 text-rose-gold" : "border-ink/10 text-ink/70"
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => set("mode", "manual")}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                        draft.settings.mode === "manual" ? "border-rose-gold bg-rose-gold/10 text-rose-gold" : "border-ink/10 text-ink/70"
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  <p className="text-[11px] text-ink/35 mt-1">
                    Auto pulls the newest matching items automatically. Manual lets you hand-pick exactly which ones show.
                  </p>
                </div>
              )}

              {draft.settings.mode === "manual" && selectionKey && (
                <MultiSelectPicker
                  label={def.hasProductSelection ? "Choose products" : def.hasCategorySelection ? "Choose categories" : "Choose brands"}
                  options={pickerOptions}
                  loading={pickerLoading}
                  selectedIds={draft.settings[selectionKey] || []}
                  onChange={(ids) => set(selectionKey, ids)}
                />
              )}

              {def.hasBlogSelection && draft.settings.mode === "manual" && (
                <MultiSelectPicker
                  label="Choose blog posts"
                  options={pickerOptions}
                  loading={pickerLoading}
                  selectedIds={draft.settings.postSlugs || []}
                  onChange={(ids) => set("postSlugs", ids)}
                />
              )}

              {def.hasCountdown && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.settings.showCountdown !== false} onChange={(e) => set("showCountdown", e.target.checked)} />
                  Show countdown timer
                </label>
              )}

              {def.hasViewAllButton && (
                <div className="border-t border-border-soft pt-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.settings.showViewAll !== false} onChange={(e) => set("showViewAll", e.target.checked)} />
                    Show "View all" button
                  </label>
                  {draft.settings.showViewAll !== false && (
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Button text (default: View all)" value={draft.settings.viewAllText || ""} onChange={(e) => set("viewAllText", e.target.value)} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                      <input placeholder="Button URL (default link)" value={draft.settings.viewAllUrl || ""} onChange={(e) => set("viewAllUrl", e.target.value)} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                    </div>
                  )}
                </div>
              )}

              {def.hasImage && !isCustomBanner && (
                <div className="border-t border-border-soft pt-4">
                  {/* Capped: the section's photo is portrait, and a 4:5 drop zone
                      at the modal's full width is nearly 900px tall — it would
                      push everything else out of view. */}
                  <div className="max-w-[220px]">
                    <SingleImageUpload
                      label="Section photo"
                      value={draft.settings.image || ""}
                      onChange={(url) => set("image", url)}
                      aspect={4 / 5}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-ink/60">
                    Leave empty to keep the photo the section shipped with.
                  </p>
                </div>
              )}

              {section.sectionKey === "instagram" && (
                <div className="border-t border-border-soft pt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Instagram handle</label>
                    <input placeholder="seoulglowbangladesh" value={draft.settings.handle || ""} onChange={(e) => set("handle", e.target.value)} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  </div>
                  {/* No post-count control: this section is a single link to the
                      profile, so there is nothing to count. */}
                  <p className="rounded-lg bg-beige/60 px-4 py-3 text-[11px] leading-relaxed text-ink/70">
                    This section links to your Instagram profile — there is no photo grid to
                    configure. Edit the heading and subtitle above to change what it says.
                  </p>
                </div>
              )}

              {section.sectionKey === "newsletter" && (
                <div className="border-t border-border-soft pt-4 space-y-3">
                  <input placeholder="Button text (default: Subscribe)" value={draft.settings.buttonText || ""} onChange={(e) => set("buttonText", e.target.value)} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  <SingleImageUpload label="Background image (optional)" value={draft.settings.backgroundImage || ""} onChange={(url) => set("backgroundImage", url)} aspect={21 / 9} />
                </div>
              )}

              {isCustomBanner && (
                <div className="border-t border-border-soft pt-4 space-y-3">
                  <SingleImageUpload label="Banner image" value={draft.settings.image || ""} onChange={(url) => set("image", url)} aspect={21 / 9} />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Button text" value={draft.settings.buttonText || ""} onChange={(e) => set("buttonText", e.target.value)} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                    <input placeholder="Button URL" value={draft.settings.buttonUrl || ""} onChange={(e) => set("buttonUrl", e.target.value)} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Text alignment</label>
                    <select value={draft.settings.textAlign || "left"} onChange={(e) => set("textAlign", e.target.value)} className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              )}

              {!isHero &&
                !isCustomBanner &&
                !def.hasTitleSubtitle &&
                !def.hasProductSelection &&
                !def.hasCategorySelection &&
                !def.hasBrandSelection &&
                !def.hasBlogSelection &&
                !def.hasImage && (
                  <p className="text-xs text-ink/70 bg-beige/60 rounded-lg p-3">
                    This section doesn't have additional content settings — you can still reorder, enable/disable, and adjust Design/Schedule.
                  </p>
                )}
            </>
          )}

          {tab === "design" && <DesignFields design={design} onChange={setDesignPatch} />}

          {tab === "schedule" && (
            <ScheduleFields
              enabled={section.enabled}
              status={draft.status}
              publishAt={draft.publishAt}
              unpublishAt={draft.unpublishAt}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
          )}

          {tab === "history" && (
            <div>
              <p className="text-[11px] text-ink/70 mb-3">Every saved change to this section, most recent first. Restoring snapshots your current state too, so it's never a dead end.</p>
              {revisionsLoading && (
                <div className="space-y-2 animate-pulse">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 bg-beige/60 rounded-lg" />
                  ))}
                </div>
              )}
              {!revisionsLoading && revisions && revisions.length === 0 && (
                <p className="text-xs text-ink/70 bg-beige/60 rounded-lg p-3">No past revisions yet — they appear here after your first saved edit.</p>
              )}
              {!revisionsLoading && revisions && revisions.length > 0 && (
                <div className="space-y-2">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="flex items-center gap-3 border border-ink/10 rounded-lg px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{rev.title}</p>
                        <p className="text-[11px] text-ink/70">{timeAgo(rev.createdAt)} · {rev.status === "DRAFT" ? "Draft" : "Published"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmRestore(rev)}
                        disabled={restoringId === rev.id}
                        className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-ink/10 px-3 py-2 hover:border-rose-gold hover:text-rose-gold-text transition-colors disabled:opacity-50 shrink-0"
                      >
                        {restoringId === rev.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "preview" && <SectionPreview sectionKey={section.sectionKey} settings={draft.settings} />}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-border-soft px-6 py-4 shrink-0">
          <button onClick={handleSave} disabled={closing || autosaveStatus === "saving"} className="btn-primary w-full">
            {closing || autosaveStatus === "saving" ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRestore !== null}
        title="Restore this revision?"
        message={confirmRestore ? `This replaces the current content with the version from ${timeAgo(confirmRestore.createdAt)}. Your current state is saved to history first, so you can always undo this.` : ""}
        confirmLabel="Restore"
        danger={false}
        loading={restoringId !== null}
        onConfirm={() => confirmRestore && restoreRevision(confirmRestore)}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  );
}
