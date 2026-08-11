import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import Link from "next/link";

export type StatTone = "default" | "warning" | "danger" | "success" | "info" | "violet";

/** Per-tone gradient wash, icon chip and accent bar. Kept in one map so a tone is
 * a single decision at the call site rather than five coordinated class strings. */
const TONE: Record<StatTone, { surface: string; chip: string; accent: string; glow: string }> = {
  default: {
    surface: "from-rose-gold/[0.09] via-white to-white",
    chip: "bg-gradient-to-br from-rose-gold to-rose-gold-light text-white",
    accent: "bg-rose-gold",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(198,138,138,0.45)]",
  },
  success: {
    surface: "from-success/[0.10] via-white to-white",
    chip: "bg-gradient-to-br from-success to-[#6FAE88] text-white",
    accent: "bg-success",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(77,143,106,0.40)]",
  },
  warning: {
    surface: "from-gold/[0.14] via-white to-white",
    chip: "bg-gradient-to-br from-gold to-[#D4B77C] text-white",
    accent: "bg-gold",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(185,151,91,0.42)]",
  },
  danger: {
    surface: "from-badge-sale/[0.09] via-white to-white",
    chip: "bg-gradient-to-br from-badge-sale to-[#FF7089] text-white",
    accent: "bg-badge-sale",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(255,59,92,0.38)]",
  },
  info: {
    surface: "from-badge-coupon/[0.09] via-white to-white",
    chip: "bg-gradient-to-br from-badge-coupon to-[#5B8DE8] text-white",
    accent: "bg-badge-coupon",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(45,108,223,0.35)]",
  },
  violet: {
    surface: "from-badge-onetwo/[0.09] via-white to-white",
    chip: "bg-gradient-to-br from-badge-onetwo to-[#9F6BF0] text-white",
    accent: "bg-badge-onetwo",
    glow: "group-hover:shadow-[0_18px_44px_-12px_rgba(124,58,237,0.35)]",
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  href,
  hint,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: StatTone;
  href?: string;
  /** Small muted line under the value — context like "vs. last month". */
  hint?: string;
  /** Optional change indicator. `direction` drives colour and arrow; pass only
   * when there is a real comparison to show — never invent a delta. */
  trend?: { value: string; direction: "up" | "down" | "flat" };
}) {
  const t = TONE[tone];
  const TrendIcon = trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  const trendClass =
    trend?.direction === "up"
      ? "text-success bg-success/10"
      : trend?.direction === "down"
      ? "text-badge-sale bg-badge-sale/10"
      : "text-ink/70 bg-ink/[0.06]";

  const content = (
    <div
      className={`group relative h-full overflow-hidden rounded-xl2 border border-border-soft/80 bg-gradient-to-br ${t.surface} p-5 shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-1 hover:border-transparent ${t.glow}`}
    >
      {/* Left accent rail — reveals on hover, the Linear/Vercel-style tell that a
          card is interactive without adding a visible button. */}
      <span
        className={`absolute inset-y-0 left-0 w-1 origin-top scale-y-0 transition-transform duration-300 ease-silk group-hover:scale-y-100 ${t.accent}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-e1 ${t.chip}`}>
          <Icon size={19} strokeWidth={2} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${trendClass}`}>
            <TrendIcon size={12} strokeWidth={2.5} />
            {trend.value}
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">{label}</p>
      {/* Steps up with the card. At the display size these cards use on a
          desktop, a five-figure currency value overflowed a narrow card on a
          phone or tablet — and it's the money figures that most need reading. */}
      <p className="mt-1 font-display text-xl font-semibold leading-tight text-ink tabular-nums xl:text-[1.75rem]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/70">{hint}</p>}

      {href && (
        <ArrowUpRight
          size={15}
          className="absolute right-4 bottom-4 text-ink/20 opacity-0 transition-all duration-300 ease-silk group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-xl2">
      {content}
    </Link>
  ) : (
    content
  );
}
