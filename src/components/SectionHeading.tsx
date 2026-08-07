import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The homepage band header and its exit control.
 *
 * The category and brand walls arrived at this shape first — centred eyebrow,
 * display title, one short line of support, and a single pill button under the
 * content — while the product rails kept an older left-aligned title with a
 * small text link floated to the far right. On a wide screen that link sat
 * about a thousand pixels from the heading it belonged to, which is what made
 * a rail read as an empty band with two unrelated things in it.
 *
 * Both live here so the two halves of a section can't drift apart again, and
 * so a rail that gains an eyebrow tomorrow gains the same eyebrow everywhere.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Rendered under the title — the flash-sale countdown, for instance. */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-10 text-center">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {description && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">{description}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function SectionViewAll({ href, label }: { href: string; label?: string }) {
  // Both translations of the default label end in a "→" glyph, left over from
  // when this was a plain text link. The button draws its own animated arrow,
  // so a baked-in one is stripped rather than rendering "View all → →".
  const text = (label || "View all").replace(/\s*[→›»>]+\s*$/u, "").trim();

  return (
    <div className="mt-10 text-center">
      <Link
        href={href}
        className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink/15 bg-white px-7 text-sm font-semibold text-ink transition-colors duration-300 hover:border-rose-gold hover:text-rose-gold-text"
      >
        {text}
        <ArrowRight
          size={15}
          aria-hidden="true"
          className="transition-transform duration-300 ease-silk group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
