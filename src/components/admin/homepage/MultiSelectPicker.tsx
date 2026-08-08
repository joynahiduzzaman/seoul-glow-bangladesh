"use client";

import { useState } from "react";

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
  thumbnail?: string;
}

/** Generic searchable multi-select checklist — reused for the product, category,
 * brand, and blog-post pickers across the Homepage Builder's "manual selection"
 * settings. Each caller just supplies its own options + selection state. */
export default function MultiSelectPicker({
  label,
  options,
  loading,
  selectedIds,
  onChange,
  maxHeight = 260,
}: {
  label: string;
  options: PickerOption[];
  loading?: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxHeight?: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-ink/70">{label}</label>
        <span className="text-[11px] text-ink/35">{selectedIds.length} selected</span>
      </div>
      <input
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-xs mb-2"
      />
      <div className="border border-ink/10 rounded-lg overflow-y-auto divide-y divide-ink/5" style={{ maxHeight }}>
        {loading && (
          <div className="p-2 space-y-2 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-1 py-1">
                <span className="h-7 w-7 rounded bg-beige shrink-0" />
                <span className="h-3 flex-1 rounded bg-beige" />
              </div>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && <p className="text-xs text-ink/70 p-3">No matches.</p>}
        {!loading &&
          filtered.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-beige/40">
              <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={() => toggle(o.id)} className="shrink-0" />
              {o.thumbnail ? (
                // contain, not cover: brand logos are wordmarks of wildly
                // different proportions, and cropping one to a square is what
                // makes a picker of logos unreadable.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.thumbnail} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain" />
              ) : (
                <span className="h-7 w-7 rounded bg-beige shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.label}</span>
                {o.sublabel && <span className="block truncate text-ink/70">{o.sublabel}</span>}
              </span>
            </label>
          ))}
      </div>
    </div>
  );
}
