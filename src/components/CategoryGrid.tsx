import Link from "next/link";
import { Dictionary } from "@/lib/i18n/dictionaries";

export interface CategoryGridItem {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

// Grid column counts the admin can pick from — kept as literal Tailwind classes
// (not string-concatenated) so Tailwind's JIT compiler can actually see them.
const COLUMNS_CLASSES: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6",
};

// Falls back to an Unsplash placeholder only when a category has no image of its
// own in the database — keeps the original site's visual richness for any category
// an admin hasn't uploaded a photo for yet.
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80",
];

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
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-3">{subtitle || "Shop the Routine"}</p>
          <h2 className="section-title">{title || dict.home.shopByCategory}</h2>
        </div>
        <Link href="/shop" className="text-sm text-rose-gold-text hover:underline shrink-0">{dict.home.viewAll}</Link>
      </div>

      {/* Elegant rounded-square editorial cards — real photography, soft shadow, hover lift. */}
      <div className={`grid ${COLUMNS_CLASSES[columns] || COLUMNS_CLASSES[6]} gap-4 md:gap-5`}>
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/shop?category=${cat.slug}`}
            className="group block rounded-xl2 overflow-hidden bg-white border border-border-soft shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glass"
          >
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src={cat.image || PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>
            <div className="px-3 py-3 text-center">
              <span className="text-sm font-medium text-ink">{cat.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
