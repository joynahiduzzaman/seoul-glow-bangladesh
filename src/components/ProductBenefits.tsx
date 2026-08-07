import { benefitVisual } from "@/lib/benefit-icons";

/**
 * What this product does for your skin, as a row of icon marks.
 *
 * Sits inside the buy column, directly under the cart controls, so it is styled
 * as part of that column rather than as a full-width band: a hairline rule, a
 * modest heading and left alignment, matching the rhythm of everything above it.
 *
 * Each benefit gets its own colour and glyph rather than one repeated icon, so
 * the row can be read at a glance instead of word by word — the colour is doing
 * the sorting before the label is read. The palette is muted on purpose: a set
 * of saturated circles would read as a chart legend rather than a beauty page.
 *
 * The glyphs are decorative and hidden from assistive tech; the label beneath
 * carries the meaning, so nothing depends on recognising an icon or a colour.
 */
export default function ProductBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) return null;

  return (
    <section className="mt-6 border-t border-border-soft pt-6" aria-labelledby="key-benefits">
      <h2 id="key-benefits" className="mb-5 font-display text-lg font-semibold text-ink">
        Key Benefits
      </h2>

      <ul className="flex flex-wrap items-start gap-x-2 gap-y-5 sm:gap-x-4">
        {benefits.map((benefit) => {
          const { Icon, color } = benefitVisual(benefit);
          return (
            <li
              key={benefit}
              // Three across the narrowest phone, more as the column widens. A
              // fixed basis keeps every label in the same column width so the
              // marks line up rather than drifting with text length.
              className="flex w-[30%] max-w-[6.5rem] flex-col items-center text-center sm:w-[5.5rem]"
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: color }}
                className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-e2 ring-4 ring-white transition-transform duration-300 ease-silk hover:scale-105"
              >
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <span className="text-[12.5px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                {benefit}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
