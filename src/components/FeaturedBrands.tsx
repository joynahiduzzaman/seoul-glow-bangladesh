import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BrandCard, { type BrandCardItem } from "./BrandCard";

export type FeaturedBrandItem = BrandCardItem;

/**
 * Homepage brand wall.
 *
 * Shares BrandCard with the /brands directory rather than keeping a second tile
 * design: the two sit one click apart, and a visitor who taps through should
 * recognise the same objects rather than meet a different treatment of them.
 */
export default function FeaturedBrands({
  brands,
  title,
  subtitle,
  backgroundColor,
}: {
  brands: FeaturedBrandItem[];
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
}) {
  if (brands.length === 0) return null;

  return (
    <section className="section-py bg-beige/60" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">{subtitle || "Authorised Korean Labels"}</p>
          <h2 className="section-title">{title || "Korean Brands We Import"}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">
            Sourced directly from South Korea — every label batch-verified, never grey-market.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
          {brands.map((brand) => (
            <li key={brand.id}>
              <BrandCard brand={brand} />
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/brands"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink/15 bg-white px-7 text-sm font-semibold text-ink transition-colors duration-300 hover:border-rose-gold hover:text-rose-gold-text"
          >
            View all brands
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
