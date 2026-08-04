import type { CSSProperties } from "react";

// Universal layout controls every homepage section gets, regardless of sectionKey —
// stored under settings.design so it lives in the same JSON blob as the section's
// own content fields instead of a parallel table. Background color is applied by
// each section component directly (so it can override that component's own default
// Tailwind background class); padding/margin are applied by a thin wrapper div in
// src/app/page.tsx since they're purely additive spacing around a section that
// already lays itself out.

export interface SectionDesignSettings {
  backgroundColor: string; // "" = use the section's own default background
  paddingTop: number; // px, additive on top of the section's own vertical padding
  paddingBottom: number;
  marginTop: number;
  marginBottom: number;
}

export const DEFAULT_DESIGN_SETTINGS: SectionDesignSettings = {
  backgroundColor: "",
  paddingTop: 0,
  paddingBottom: 0,
  marginTop: 0,
  marginBottom: 0,
};

export function normalizeDesignSettings(raw: unknown): SectionDesignSettings {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<SectionDesignSettings>;
  return {
    backgroundColor: typeof d.backgroundColor === "string" ? d.backgroundColor : "",
    paddingTop: typeof d.paddingTop === "number" ? d.paddingTop : 0,
    paddingBottom: typeof d.paddingBottom === "number" ? d.paddingBottom : 0,
    marginTop: typeof d.marginTop === "number" ? d.marginTop : 0,
    marginBottom: typeof d.marginBottom === "number" ? d.marginBottom : 0,
  };
}

/** Inline style for the thin wrapper div around a rendered section — spacing only. */
export function wrapperStyle(design: SectionDesignSettings): CSSProperties {
  return {
    paddingTop: design.paddingTop || undefined,
    paddingBottom: design.paddingBottom || undefined,
    marginTop: design.marginTop || undefined,
    marginBottom: design.marginBottom || undefined,
  };
}
