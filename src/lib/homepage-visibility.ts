// Combines the four independent controls a HomepageSection row can have —
// `enabled` (manual on/off), `status` (draft vs published), `publishAt` (go live
// at a future time), `unpublishAt` (auto-hide after a time) — into the one
// question the live homepage and the admin builder both actually need answered:
// "is this section visible right now?" Keeping the rule in one place means the
// live site and the admin's status badge can never disagree about what's showing.

export interface SchedulableSection {
  enabled: boolean;
  status: string;
  publishAt: Date | string | null;
  unpublishAt: Date | string | null;
}

export type ResolvedVisibility = "live" | "disabled" | "draft" | "scheduled" | "expired";

export function resolveVisibility(section: SchedulableSection, now: Date = new Date()): ResolvedVisibility {
  if (!section.enabled) return "disabled";
  if (section.status === "DRAFT") return "draft";
  const publishAt = section.publishAt ? new Date(section.publishAt) : null;
  const unpublishAt = section.unpublishAt ? new Date(section.unpublishAt) : null;
  if (publishAt && now < publishAt) return "scheduled";
  if (unpublishAt && now >= unpublishAt) return "expired";
  return "live";
}

export function isSectionLive(section: SchedulableSection, now: Date = new Date()): boolean {
  return resolveVisibility(section, now) === "live";
}
