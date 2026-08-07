import BrandCard, { type BrandCardItem } from "./BrandCard";
import { SectionHeading, SectionViewAll } from "./SectionHeading";

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
        <SectionHeading
          eyebrow={subtitle || "Authorised Korean Labels"}
          title={title || "Korean Brands We Import"}
          description="Sourced directly from South Korea — every label batch-verified, never grey-market."
        />

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
          {brands.map((brand) => (
            <li key={brand.id}>
              <BrandCard brand={brand} />
            </li>
          ))}
        </ul>

        <SectionViewAll href="/brands" label="View all brands" />
      </div>
    </section>
  );
}
