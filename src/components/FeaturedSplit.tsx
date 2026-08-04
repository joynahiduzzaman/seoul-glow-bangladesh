import Link from "next/link";
import ProductCard, { ProductCardData } from "./ProductCard";
import { Dictionary } from "@/lib/i18n/dictionaries";

export default function FeaturedSplit({
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
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="grid md:grid-cols-[1fr_1.4fr] gap-12 items-start">
        <div className="md:sticky md:top-28">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold mb-4">{subtitle || "Curated by Our Editors"}</p>
          <h2 className="font-display text-4xl font-semibold leading-tight mb-5">{title || dict.home.featured}</h2>
          <p className="text-ink/70 leading-relaxed mb-8 max-w-sm">
            The formulas we keep coming back to — chosen for how they perform in Bangladesh's climate, not just how they photograph.
          </p>
          {showViewAll && (
            <Link href={viewAllUrl || "/shop?filter=featured"} className="btn-primary">
              {viewAllText || dict.home.viewAll.replace(" →", "")}
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
