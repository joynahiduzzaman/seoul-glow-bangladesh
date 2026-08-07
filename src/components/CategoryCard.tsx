import Link from "next/link";
import Image from "next/image";

export interface CategoryCardItem {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
}

/**
 * One category tile.
 *
 * Deliberately the same silhouette as BrandCard — image plate above, tinted
 * label plate below — so the two directories read as one system. The plate
 * itself differs because the content does: a category is represented by a
 * photograph, which is cropped to fill, where a brand is represented by a mark,
 * which must be contained and never cropped.
 *
 * Categories have no page of their own; the shop filters by them, which is what
 * every other category link on the site already does.
 */
export default function CategoryCard({
  category,
  priority,
}: {
  category: CategoryCardItem;
  priority?: boolean;
}) {
  const count = category.productCount;

  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e1 transition-all duration-500 ease-silk hover:-translate-y-1 hover:border-rose-gold/30 hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-beige">
        {category.image ? (
          <Image
            src={category.image}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.06]"
          />
        ) : (
          <span className="flex h-full items-center justify-center font-display text-2xl text-rose-gold/50">
            {category.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 border-t border-border-soft bg-beige/40 px-3 py-3.5 text-center transition-colors duration-500 group-hover:bg-beige/70">
        <span className="line-clamp-1 font-display text-[15px] leading-snug text-ink transition-colors duration-300 group-hover:text-rose-gold-text">
          {category.name}
        </span>
        {typeof count === "number" && (
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/50">
            {count} {count === 1 ? "product" : "products"}
          </span>
        )}
      </div>
    </Link>
  );
}
