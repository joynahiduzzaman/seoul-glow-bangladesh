import { benefitVisual } from "@/lib/benefit-icons";

/**
 * What this product does for your skin, as a row of icon marks.
 *
 * Each benefit gets its own colour and glyph rather than one repeated icon, so
 * the row can be read at a glance instead of word by word — the colour is doing
 * the sorting before the label is read. The palette is muted on purpose: six
 * saturated circles would read as a chart legend rather than a beauty page.
 *
 * The glyphs are decorative and hidden from assistive tech; the label beneath
 * carries the meaning, so nothing depends on recognising an icon or a colour.
 */
export default function ProductBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) return null;

  return (
    <section className="mt-14 md:mt-20">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 text-center sm:mb-9">
          <p className="eyebrow mb-2.5">Why it works</p>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Key Benefits</h2>
        </header>

        <ul className="flex flex-wrap items-start justify-center gap-x-2 gap-y-6 sm:gap-x-5">
          {benefits.map((benefit) => {
            const { Icon, color } = benefitVisual(benefit);
            return (
              <li
                key={benefit}
                // Three across a 320px phone, more as the row widens. A fixed
                // basis keeps every label in the same column width so the marks
                // line up rather than drifting with text length.
                className="flex w-[30%] max-w-[7rem] flex-col items-center text-center sm:w-24"
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: color }}
                  className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-e2 ring-4 ring-white transition-transform duration-300 ease-silk hover:scale-105 sm:h-16 sm:w-16"
                >
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <span className="text-[13px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                  {benefit}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
