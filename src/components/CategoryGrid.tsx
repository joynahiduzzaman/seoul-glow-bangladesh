import { Dictionary } from "@/lib/i18n/dictionaries";
import CategoryCard, { type CategoryCardItem } from "./CategoryCard";
import { SectionHeading, SectionViewAll } from "./SectionHeading";

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

  return (
    <section className="section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        <SectionHeading
          eyebrow={subtitle || "Shop the Routine"}
          title={title || dict.home.shopByCategory}
          description="Every step of the routine, from first cleanse to sunscreen."
        />

        <ul className={`grid ${COLUMNS_CLASSES[columns] || COLUMNS_CLASSES[6]} gap-3 sm:gap-5`}>
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>

        <SectionViewAll href="/categories" label={dict.home.viewAll} />
      </div>
    </section>
  );
}
