import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Dictionary } from "@/lib/i18n/dictionaries";
import CategoryCard, { type CategoryCardItem } from "./CategoryCard";

export type CategoryGridItem = CategoryCardItem;

// Grid column counts the admin can pick from — kept as literal Tailwind classes
// (not string-concatenated) so Tailwind's JIT compiler can actually see them.
const COLUMNS_CLASSES: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

/**
 * Homepage category wall.
 *
 * Shares CategoryCard with the /categories directory, and mirrors the brand
 * section beat for beat — centred header, the same tile, one exit button — so
 * the two bands on the homepage read as a pair rather than as two components
 * that happen to sit near each other.
 *
 * The "view all" link used to point at /shop, which meant a control promising
 * categories delivered the unfiltered product grid. It goes to the directory.
 */
export default function CategoryGrid({
  dict,
  categories,
  title,
  subtitle,
  columns = 6,
  backgroundColor,
}: {
  dict: Dictionary;
  categories: CategoryGridItem[];
  title?: string;
  subtitle?: string;
  columns?: number;
  backgroundColor?: string;
}) {
  if (categories.length === 0) return null;

  // Both translations of this label end in a "→" glyph, from when it was a plain
  // text link. The button draws its own animated arrow, so the baked-in one is
  // stripped rather than rendering "View all → →".
  const viewAllLabel = (dict.home.viewAll || "View all").replace(/\s*[→›»>]+\s*$/u, "").trim();

  return (
    <section className="section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">{subtitle || "Shop the Routine"}</p>
          <h2 className="section-title">{title || dict.home.shopByCategory}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">
            Every step of the routine, from first cleanse to sunscreen.
          </p>
        </div>

        <ul className={`grid ${COLUMNS_CLASSES[columns] || COLUMNS_CLASSES[6]} gap-3 sm:gap-5`}>
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/categories"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink/15 bg-white px-7 text-sm font-semibold text-ink transition-colors duration-300 hover:border-rose-gold hover:text-rose-gold-text"
          >
            {viewAllLabel}
            <ArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform duration-300 ease-silk group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
