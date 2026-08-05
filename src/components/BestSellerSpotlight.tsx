import Link from "next/link";
import Image from "next/image";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { ProductCardData } from "./ProductCard";
import { BadgeStamp } from "./Badge";
import { Star } from "lucide-react";
import { Dictionary } from "@/lib/i18n/dictionaries";

export default function BestSellerSpotlight({
  dict,
  products,
  title,
  subtitle,
  showViewAll = true,
  viewAllText,
  viewAllUrl,
  backgroundColor,
}: {
  dict: Dictionary;
  products: ProductCardData[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllText?: string;
  viewAllUrl?: string;
  backgroundColor?: string;
}) {
  if (products.length === 0) return null;
  const [hero, ...rest] = products;
  const heroImages = parseJsonArray(hero.images);
  const heroPrice = discountedPrice(hero.price, hero.discountPercent);

  return (
    <section className="bg-beige/40 section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-olive font-semibold mb-2">{subtitle}</p>}
            <h2 className="section-title">{title || dict.home.bestSellers}</h2>
          </div>
          {showViewAll && (
            <Link href={viewAllUrl || "/shop?filter=bestseller"} className="link-tap text-sm text-rose-gold-text hover:underline">
              {viewAllText || dict.home.viewAll}
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-10">
          {/* Large spotlight for the #1 bestseller */}
          <Link href={`/product/${hero.slug}`} className="group relative rounded-xl2 overflow-hidden bg-white ring-1 ring-ink/5 flex flex-col sm:flex-row">
            <div className="relative aspect-square sm:aspect-auto sm:w-1/2 overflow-hidden">
              {heroImages[0] && (
                <Image
                  src={heroImages[0]}
                  alt={hero.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute top-5 left-5"><BadgeStamp variant="best" /></div>
            </div>
            <div className="p-8 flex flex-col justify-center sm:w-1/2">
              <p className="text-xs uppercase tracking-wide text-olive font-semibold mb-2">{hero.brand.name}</p>
              <h3 className="font-display text-2xl mb-3 leading-snug">{hero.name}</h3>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-semibold text-xl text-ink">{formatBDT(heroPrice)}</span>
                {hero.discountPercent > 0 && <span className="text-sm text-ink/70 line-through">{formatBDT(hero.price)}</span>}
              </div>
              <span className="text-sm text-rose-gold-text font-medium group-hover:underline">Shop this bestseller →</span>
            </div>
          </Link>

          {/* Supporting list of other bestsellers */}
          <div className="space-y-4">
            {rest.slice(0, 3).map((p) => {
              const images = parseJsonArray(p.images);
              const price = discountedPrice(p.price, p.discountPercent);
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="group flex items-center gap-4 bg-white rounded-xl p-3 ring-1 ring-ink/5 hover:ring-rose-gold/40 transition-all">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-beige shrink-0">
                    {images[0] && <Image src={images[0]} alt={p.name} fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-olive">{p.brand.name}</p>
                    <p className="text-sm font-medium line-clamp-1 group-hover:text-rose-gold-text transition-colors">{p.name}</p>
                    <span className="text-sm font-semibold text-ink">{formatBDT(price)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
