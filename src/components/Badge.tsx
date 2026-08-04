import { ReactNode } from "react";

export type BadgeVariant = "best" | "sale" | "coupon" | "today" | "new" | "onetwo";

const PILL_LABELS: Record<BadgeVariant, string> = {
  best: "BEST",
  sale: "SALE",
  coupon: "COUPON",
  today: "HOT DEAL",
  new: "NEW",
  onetwo: "1+1",
};

/** Tones for the STAMP, which sits on frosted glass over product photography.
 * Photography is unpredictable, so these keep the vivid brand values. */
const ACCENT: Record<BadgeVariant, string> = {
  best: "text-badge-best",
  sale: "text-badge-sale",
  coupon: "text-badge-coupon",
  today: "text-badge-today",
  new: "text-badge-new",
  onetwo: "text-badge-onetwo",
};

/** Tones for the PILL, whose surface is a known light colour (bg-white/70 over
 * cream). Three of the vivid values measure below the 4.5:1 AA floor there
 * (sale 3.42, today 2.81, new 3.33), so the pill uses darkened counterparts.
 * Kept as a separate map rather than darkening ACCENT outright, because the
 * stamp's background is photography and doesn't share the constraint. */
const PILL_ACCENT: Record<BadgeVariant, string> = {
  ...ACCENT,
  sale: "text-badge-sale-text",
  today: "text-badge-today-text",
  new: "text-badge-new-text",
};

/** Small glass pill tag — refined, translucent version of the merchandising row shown
 * under each product (still communicates SALE/HOT DEAL urgency, but reads as editorial
 * rather than a flat discount-retailer sticker). */
export function BadgePill({ variant, children }: { variant: BadgeVariant; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-current/20 bg-white/70 backdrop-blur px-2 py-0.5 text-[10px] font-semibold tracking-wide ${PILL_ACCENT[variant]}`}
    >
      {children || PILL_LABELS[variant]}
    </span>
  );
}

/** The "stamp" badge laid over product photography — a glass pill rather than a flat
 * colored disc, so it sits quietly on luxury imagery instead of shouting.
 *
 * Deliberately a pill (not a fixed-size circle): labels range from "NEW" to
 * "HOT DEAL", and a fixed circle forced the longer ones to wrap onto two cramped
 * lines. `whitespace-nowrap` + horizontal padding lets the shape follow the word,
 * which is both sturdier and closer to how Olive Young/Laneige tag their imagery. */
export function BadgeStamp({ variant = "best" }: { variant?: BadgeVariant }) {
  return (
    <div
      className={`inline-flex h-7 items-center justify-center whitespace-nowrap rounded-full glass px-3 shadow-e1 ring-1 ring-white/40 ${ACCENT[variant]}`}
      aria-hidden="true"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] leading-none">{PILL_LABELS[variant]}</span>
    </div>
  );
}
