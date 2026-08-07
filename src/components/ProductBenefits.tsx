import { Check } from "lucide-react";

/**
 * What this product does for your skin, as a scannable list.
 *
 * Rows inside one panel rather than a grid of separate tiles: with three or
 * four short phrases, tiles gave each one a large card and a repeated icon,
 * which read as a dashboard of identical widgets rather than a claim list. A
 * shared surface divided by hairlines lets the eye run straight down the
 * benefits, which is the only thing being compared here.
 */
export default function ProductBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) return null;

  return (
    <section className="mt-14 md:mt-20">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center sm:mb-8">
          <p className="eyebrow mb-2.5">Why it works</p>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Key Benefits</h2>
        </header>

        <ul className="overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e1 sm:grid sm:grid-cols-2">
          {benefits.map((benefit, i) => {
            // An odd final item would sit in one column and leave the row half
            // empty — with the hairline above it stopping mid-panel. Spanning
            // both tracks keeps every divider edge to edge.
            const isLoneLast = i === benefits.length - 1 && benefits.length % 2 === 1;
            return (
            <li
              key={benefit}
              className={[
                "flex items-center gap-3.5 px-5 py-4 sm:px-6 sm:py-5",
                // Hairlines between rows, and between the two columns from sm.
                // Drawn per-cell rather than with divide-* so the seam is right
                // in both the stacked and the two-column arrangement.
                i > 0 ? "border-t border-border-soft" : "",
                !isLoneLast && i % 2 === 1 ? "sm:border-l sm:border-border-soft" : "",
                i === 1 ? "sm:border-t-0" : "",
                isLoneLast ? "sm:col-span-2" : "",
              ].join(" ")}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-gold/20 to-soft-pink/60 text-rose-gold-text"
                aria-hidden="true"
              >
                <Check size={15} strokeWidth={2.5} />
              </span>
              <p className="text-[15px] font-medium leading-snug text-ink">{benefit}</p>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
