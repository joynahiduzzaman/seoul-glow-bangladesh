"use client";

import { SectionDesignSettings } from "@/lib/section-design";

/** Universal layout controls shown for every homepage section — background color
 * (applied by the section component itself) plus additive padding/margin (applied
 * by a wrapper div around the rendered section). */
export default function DesignFields({
  design,
  onChange,
}: {
  design: SectionDesignSettings;
  onChange: (patch: Partial<SectionDesignSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1.5">Background color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.backgroundColor || "#ffffff"}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-10 w-12 rounded-lg border border-ink/10 cursor-pointer shrink-0"
          />
          <input
            value={design.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            placeholder="Default (leave blank)"
            className="flex-1 rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
          />
          {design.backgroundColor && (
            <button
              type="button"
              onClick={() => onChange({ backgroundColor: "" })}
              className="text-xs text-ink/70 hover:text-red-500 shrink-0"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink/35 mt-1">Leave blank to use this section's default background.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Padding top (px)</label>
          <input
            type="number"
            min={0}
            max={400}
            value={design.paddingTop}
            onChange={(e) => onChange({ paddingTop: Math.max(0, Number(e.target.value)) })}
            className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Padding bottom (px)</label>
          <input
            type="number"
            min={0}
            max={400}
            value={design.paddingBottom}
            onChange={(e) => onChange({ paddingBottom: Math.max(0, Number(e.target.value)) })}
            className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Margin top (px)</label>
          <input
            type="number"
            min={0}
            max={400}
            value={design.marginTop}
            onChange={(e) => onChange({ marginTop: Math.max(0, Number(e.target.value)) })}
            className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Margin bottom (px)</label>
          <p className="sr-only">Also controls the spacing gap before the next section.</p>
          <input
            type="number"
            min={0}
            max={400}
            value={design.marginBottom}
            onChange={(e) => onChange({ marginBottom: Math.max(0, Number(e.target.value)) })}
            className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
          />
        </div>
      </div>
      <p className="text-[11px] text-ink/35">Padding and margin add extra breathing room on top of this section's built-in spacing — 0 keeps the default look.</p>
    </div>
  );
}
