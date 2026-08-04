import Image from "next/image";

/**
 * The header brand mark.
 *
 * SOURCE: `/logo-mark.png` — the 1254px white-background master.
 *
 * Chosen over the two alternatives on file for concrete reasons:
 *   - `/logo-transparent.png` (500px RGBA) is flexible but leaves only ~250px
 *     across the emblem, which is marginal at 3× DPR. Kept for dark surfaces,
 *     where a white plate would read as a bright disc.
 *   - The debossed dark-gradient export is beautiful at full size but is
 *     tone-on-tone: at 64px its linework has almost no contrast, and its dark
 *     backdrop fights the cream header.
 * The white master has the strongest linework contrast and ~600px across the
 * emblem — the sharpest option at header sizes.
 *
 * `/logo.png` stays the OpenGraph/social card: a transparent or cropped mark
 * composites badly on several platforms, and that card wants the full lockup.
 *
 * WHY THIS CROPS THE SOURCE FILE
 * ------------------------------
 * The file is the full brand lockup: the emblem *plus* the words
 * "SEOUL GLOW / BANGLADESH / AUTHENTIC KOREAN BEAUTY". The header renders it
 * next to live text that already reads "Seoul Glow / Bangladesh", so the name
 * was being shown twice — once as crisp type, once as sub-pixel mush baked
 * into a ~50px image. That embedded micro-type is what made the logo look
 * soft and low-contrast; enlarging the whole lockup only enlarges the mush.
 *
 * So the header shows the EMBLEM ONLY, paired with the real text. That's the
 * same pattern Apple, Aesop, Dior and Olive Young use — a clean mark beside
 * (or instead of) live type, never a shrunken lockup with a tagline in it.
 *
 * Cropping in CSS rather than shipping a second cut-down file keeps one asset
 * to maintain and keeps the mark flowing through next/image's optimizer.
 *
 * CROP MATHS: in the 1254px master the emblem ring spans x 345–890, y 78–690,
 * with the blossom sprig overhanging to x≈940. Centre ≈ (642, 384).
 *
 * The crop square is 680px, not the ~620px the artwork strictly occupies: the
 * frame is a CIRCLE, so a square crop sized to the bounding box puts the ring's
 * lowest point exactly on the circle's edge and shaves it. 680 keeps every
 * extreme of the ring roughly 33px inside the inscribed circle.
 *
 * Rendering at 1254/680 = 184% of the frame and offsetting so that centre lands
 * on the frame's centre isolates it exactly:
 *   left = 50% - (642/1254 × 184%) = -44.2%
 *   top  = 50% - (384/1254 × 184%) = -6.3%
 */
const EMBLEM = {
  scale: "184%",
  left: "-44.2%",
  top: "-6.3%",
};

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span
      // White plate, not cream: the master's backdrop is white, and matching it
      // means the disc has no seam where the artwork ends. Against the cream
      // header that reads as a deliberate white coin, and the hairline ring
      // gives it a defined edge instead of letting it float.
      className={`relative block shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-ink/[0.07] shadow-e1 ${className}`}
    >
      <Image
        src="/logo-mark.png"
        // Decorative here: the adjacent wordmark (and the link's aria-label on
        // mobile, where that text is hidden) already names the brand. An alt
        // here would make screen readers announce it twice.
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        priority
        quality={95}
        // The frame renders the source at ~196%, so a 64px mark needs ~126 CSS
        // px of image — 384 covers that at up to 3× device pixel ratio.
        sizes="384px"
        className="absolute max-w-none"
        style={{ width: EMBLEM.scale, height: EMBLEM.scale, left: EMBLEM.left, top: EMBLEM.top }}
      />
    </span>
  );
}
