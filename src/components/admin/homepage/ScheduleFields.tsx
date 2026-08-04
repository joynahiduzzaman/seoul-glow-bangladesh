"use client";

import { resolveVisibility } from "@/lib/homepage-visibility";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: "Live now", className: "bg-pastel-green/60 text-olive" },
  disabled: { label: "Disabled", className: "bg-ink/10 text-ink/70" },
  draft: { label: "Draft", className: "bg-gold/15 text-gold" },
  scheduled: { label: "Scheduled", className: "bg-rose-gold/15 text-rose-gold" },
  expired: { label: "Expired", className: "bg-red-100 text-red-500" },
};

export default function ScheduleFields({
  enabled,
  status,
  publishAt,
  unpublishAt,
  onChange,
}: {
  enabled: boolean;
  status: string;
  publishAt: string | null;
  unpublishAt: string | null;
  onChange: (patch: { status?: string; publishAt?: string | null; unpublishAt?: string | null }) => void;
}) {
  const resolved = resolveVisibility({ enabled, status, publishAt, unpublishAt });
  const badge = STATUS_BADGE[resolved];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink/70">Current state:</span>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1.5">Status</label>
        <select
          value={status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
        >
          <option value="DRAFT">Draft — hidden from the live site</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Publish at (optional)</label>
          <input
            type="datetime-local"
            value={toLocalInputValue(publishAt)}
            onChange={(e) => onChange({ publishAt: fromLocalInputValue(e.target.value) })}
            className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink/70 mb-1.5">Unpublish at (optional)</label>
          <input
            type="datetime-local"
            value={toLocalInputValue(unpublishAt)}
            onChange={(e) => onChange({ unpublishAt: fromLocalInputValue(e.target.value) })}
            className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      <p className="text-[11px] text-ink/35">
        Leave both blank to publish immediately with no expiry. A section only appears on the live site when it's
        Enabled, Published, and (if scheduled) within its publish window.
      </p>
    </div>
  );
}
