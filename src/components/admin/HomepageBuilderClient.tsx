"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import toast from "react-hot-toast";
import { GripVertical, Pencil, Eye, Copy, Trash2, Plus, Loader2 } from "lucide-react";
import { definitionFor } from "@/lib/homepage-sections";
import { resolveVisibility } from "@/lib/homepage-visibility";
import SectionSettingsModal, { SectionRow } from "./SectionSettingsModal";
import ConfirmDialog from "./ConfirmDialog";

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-pastel-green/60 text-olive" },
  disabled: { label: "Disabled", className: "bg-ink/10 text-ink/70" },
  draft: { label: "Draft", className: "bg-gold/15 text-gold" },
  scheduled: { label: "Scheduled", className: "bg-rose-gold/15 text-rose-gold" },
  expired: { label: "Expired", className: "bg-red-100 text-red-500" },
};

/** One row in the builder list. Dragging is restricted to the grip handle (via
 * Framer Motion's manual dragControls) rather than the whole row, so the
 * enable toggle / edit / duplicate / delete buttons stay clickable. */
function SectionRowItem({
  section,
  def,
  togglingId,
  duplicatingId,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  section: SectionRow;
  def: ReturnType<typeof definitionFor>;
  togglingId: string | null;
  duplicatingId: string | null;
  onToggle: (s: SectionRow) => void;
  onEdit: (s: SectionRow) => void;
  onDuplicate: (s: SectionRow) => void;
  onDelete: (s: SectionRow) => void;
}) {
  const dragControls = useDragControls();
  const badge = VISIBILITY_BADGE[resolveVisibility(section)];

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={dragControls}
      className={`flex items-center gap-3 bg-white rounded-xl2 px-4 py-3.5 shadow-soft ${!section.enabled ? "opacity-60" : ""}`}
    >
      <span
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing text-ink/30 shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{section.title}</p>
        {def && <p className="text-xs text-ink/70 truncate">{def.description}</p>}
      </div>

      <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${badge.className}`}>{badge.label}</span>

      <label className="flex items-center gap-2 shrink-0 cursor-pointer">
        <span className="text-[11px] text-ink/70">{section.enabled ? "Enabled" : "Disabled"}</span>
        <input
          type="checkbox"
          checked={section.enabled}
          disabled={togglingId === section.id}
          onChange={() => onToggle(section)}
          className="sr-only peer"
        />
        <span
          onClick={() => !togglingId && onToggle(section)}
          className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer ${section.enabled ? "bg-rose-gold" : "bg-ink/15"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${section.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
        </span>
      </label>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(section)} aria-label={`Edit ${section.title}`} className="p-2 text-ink/70 hover:text-rose-gold">
          <Pencil size={15} />
        </button>
        {def?.isCustom && (
          <>
            <button
              onClick={() => onDuplicate(section)}
              disabled={duplicatingId === section.id}
              aria-label={`Duplicate ${section.title}`}
              className="p-2 text-ink/70 hover:text-rose-gold disabled:opacity-40"
            >
              {duplicatingId === section.id ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
            </button>
            <button onClick={() => onDelete(section)} aria-label={`Delete ${section.title}`} className="p-2 text-ink/70 hover:text-red-500">
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function HomepageBuilderClient({ initialSections }: { initialSections: SectionRow[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionRow[]>(initialSections);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [editing, setEditing] = useState<SectionRow | null>(null);
  const [deleting, setDeleting] = useState<SectionRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Warn before leaving the tab/window with a reordered-but-unsaved layout —
  // the per-row toggle/edit actions all save instantly, so this only ever
  // guards the one action ("Save Layout") that's staged rather than immediate.
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function saveLayout() {
    setSaving(true);
    try {
      const order = sections.map((s, i) => ({ id: s.id, displayOrder: i }));
      const res = await fetch("/api/admin/homepage-sections/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Layout saved — live on the homepage now");
      setDirty(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(section: SectionRow) {
    setTogglingId(section.id);
    // Applies immediately (not staged with the rest of the layout) — matches the
    // spec's per-card toggle being a distinct, instant control from "Save Layout",
    // which is specifically about order.
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, enabled: !s.enabled } : s)));
    try {
      const res = await fetch(`/api/admin/homepage-sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !section.enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err: any) {
      // Revert the optimistic update on failure.
      setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, enabled: section.enabled } : s)));
      toast.error(err.message || "Failed to update section");
    } finally {
      setTogglingId(null);
    }
  }

  async function addSection() {
    setAddingSection(true);
    try {
      const res = await fetch("/api/admin/homepage-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "customBanner" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSections((prev) => [...prev, data.section]);
      toast.success("Custom Banner added — edit it, then drag it into place");
    } catch (err: any) {
      toast.error(err.message || "Failed to add section");
    } finally {
      setAddingSection(false);
    }
  }

  async function duplicateSection(section: SectionRow) {
    setDuplicatingId(section.id);
    try {
      const res = await fetch("/api/admin/homepage-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: section.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSections((prev) => [...prev, data.section]);
      toast.success("Section duplicated — live on the homepage now");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate section");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/homepage-sections/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setSections((prev) => prev.filter((s) => s.id !== deleting.id));
      toast.success("Section deleted");
      setDeleting(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete section");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink/70">Drag to reorder, then save. Enable/disable and edits apply immediately.</p>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs text-rose-gold-text hover:underline flex items-center gap-1">
            <Eye size={13} /> Preview live site
          </a>
          <button
            onClick={addSection}
            disabled={addingSection}
            className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-ink/10 px-3.5 py-2.5 hover:border-rose-gold hover:text-rose-gold-text transition-colors disabled:opacity-50"
          >
            {addingSection ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add Custom Banner
          </button>
          <button onClick={saveLayout} disabled={!dirty || saving} className="btn-primary !h-10 !px-5 !text-xs disabled:opacity-40">
            {saving ? "Saving…" : dirty ? "Save Layout" : "Layout Saved"}
          </button>
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={sections}
        onReorder={(next) => {
          setSections(next);
          setDirty(true);
        }}
        className="space-y-2"
      >
        {sections.map((section) => (
          <SectionRowItem
            key={section.id}
            section={section}
            def={definitionFor(section.sectionKey)}
            togglingId={togglingId}
            duplicatingId={duplicatingId}
            onToggle={toggleEnabled}
            onEdit={setEditing}
            onDuplicate={duplicateSection}
            onDelete={setDeleting}
          />
        ))}
      </Reorder.Group>

      {/* Keyed by section id so React fully remounts (fresh useState) per section —
          without this, the modal's initial title/settings state (computed once from
          `section` at first mount, while `section` was still null) would stick across
          every subsequent section it's opened for instead of reinitializing. */}
      <SectionSettingsModal
        key={editing?.id}
        section={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setSections((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this section?"
        message={deleting ? `"${deleting.title}" will be removed from the homepage builder entirely.` : ""}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
