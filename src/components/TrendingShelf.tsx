import Link from "next/link";
import ProductCard, { ProductCardData } from "./ProductCard";
import { Dictionary } from "@/lib/i18n/dictionaries";

export default function TrendingShelf({
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

  return (
    <section className="section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto flex items-end justify-between mb-8">
        <div>
          {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-2">{subtitle}</p>}
          <h2 className="section-title">{title || dict.home.trending}</h2>
        </div>
        {showViewAll && (
          <Link href={viewAllUrl || "/shop?filter=trending"} className="text-sm text-rose-gold-text hover:underline">
            {viewAllText || dict.home.viewAll}
          </Link>
        )}
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 container-px mx-auto w-max min-w-full">
          {products.map((p) => (
            <div key={p.id} className="w-56 shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
