import {
  Droplets,
  Leaf,
  ShieldCheck,
  Sun,
  CircleDot,
  MoveUp,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon and colour for a product benefit.
 *
 * Benefits are free text typed in the admin panel, so they are matched on
 * keywords rather than an enum. Anything unmatched still gets a mark — a stable
 * one, chosen from the name so the same benefit always looks the same across
 * products rather than shuffling between renders.
 *
 * The palette is a deliberately muted set: each tone is dark enough for a white
 * glyph to read clearly, and desaturated enough that six of them side by side
 * stay calm against cream instead of looking like a chart legend.
 */
export interface BenefitVisual {
  Icon: LucideIcon;
  /** Background of the circular badge. */
  color: string;
}

const HYDRATION: BenefitVisual = { Icon: Droplets, color: "#4A6FA5" };
const SOOTHING: BenefitVisual = { Icon: Leaf, color: "#5B7B4F" };
const BARRIER: BenefitVisual = { Icon: ShieldCheck, color: "#4C5680" };
const BRIGHTENING: BenefitVisual = { Icon: Sun, color: "#B08040" };
const PORES: BenefitVisual = { Icon: CircleDot, color: "#6E5068" };
const FIRMING: BenefitVisual = { Icon: MoveUp, color: "#4F6B73" };
const TEXTURE: BenefitVisual = { Icon: Sparkles, color: "#8A5A6B" };
const OIL: BenefitVisual = { Icon: Wind, color: "#3F6B63" };

/** Ordered: the first keyword found wins, so put the specific before the broad. */
const RULES: Array<[RegExp, BenefitVisual]> = [
  [/barrier|strengthen|protect|defen[cs]e/i, BARRIER],
  [/hydrat|moistur|water|dewy|plump/i, HYDRATION],
  [/sooth|calm|redness|irritat|sensitiv|heal|repair/i, SOOTHING],
  [/bright|glow|radian|tone|dark spot|whiten|luminous/i, BRIGHTENING],
  [/pore|blackhead|sebum|blemish|acne|breakout/i, PORES],
  [/firm|lift|tighten|elastic|anti[- ]?ag|wrinkle|fine line|sagg/i, FIRMING],
  [/oil|shine|mattif|balanc|purif|detox/i, OIL],
  [/textur|smooth|exfoliat|refin|soft|even/i, TEXTURE],
];

const FALLBACK = [BRIGHTENING, SOOTHING, HYDRATION, TEXTURE, FIRMING, PORES];

export function benefitVisual(benefit: string): BenefitVisual {
  for (const [pattern, visual] of RULES) {
    if (pattern.test(benefit)) return visual;
  }
  // Stable pick rather than random or index-based, so an unmatched benefit keeps
  // the same mark wherever it appears.
  let hash = 0;
  for (let i = 0; i < benefit.length; i++) hash = (hash * 31 + benefit.charCodeAt(i)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}
