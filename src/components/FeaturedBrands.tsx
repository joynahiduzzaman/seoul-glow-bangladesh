import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export interface FeaturedBrandItem {
  id: string;
  name: string;
  slug: string;
  /** Brand mark, if one has been uploaded. Rendered contained (never stretched). */
  logo?: string | null;
  /** Representative product shot for this brand — used as the tile visual when
   * there's no logo on file, which is currently every brand. */
  image?: string | null;
}

/** Monogram used only when a brand has neither a logo nor any product imagery —
 * the last-resort tile so a new brand never renders as an empty box. */
function BrandMonogram({ name }: { name: string }) {
  const letters = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-beige via-cream to-soft-pink/50">
      <span className="font-display text-3xl font-semibold text-rose-gold/70">{letters}</span>
    </div>
  );
}

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
    <section className="bg-beige/60 section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">{subtitle || "Authorised Korean Labels"}</p>
          <h2 className="section-title">{title || "Korean Brands We Import"}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">
            Sourced directly from South Korea — every label batch-verified, never grey-market.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group relative overflow-hidden rounded-xl2 border border-border-soft/70 bg-white shadow-e1 transition-all duration-500 ease-silk hover:-translate-y-1.5 hover:border-rose-gold/30 hover:shadow-e4"
            >
              {/* Visual plate — a fixed 4:3 box keeps every tile identical in
                  height regardless of the source image's aspect ratio. */}
              <div className="relative aspect-[4/3] overflow-hidden bg-beige/60">
                {brand.logo ? (
                  <div className="absolute inset-0 flex items-center justify-center p-5">
                    <div className="relative h-full w-full">
                      <Image
                        src={brand.logo}
                        alt={`${brand.name} logo`}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
                        className="object-contain transition-transform duration-500 ease-silk group-hover:scale-105"
                      />
                    </div>
                  </div>
                ) : brand.image ? (
                  <Image
                    src={brand.image}
                    alt={`${brand.name} skincare`}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
                    className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.08]"
                  />
                ) : (
                  <BrandMonogram name={brand.name} />
                )}

                {/* Soft bottom scrim so the label plate below never looks detached
                    from the image above it. */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/70 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-1.5 px-3.5 py-3">
                <span className="truncate font-display text-[15px] leading-snug text-ink transition-colors duration-300 group-hover:text-rose-gold-text">
                  {brand.name}
                </span>
                <ArrowUpRight
                  size={14}
                  className="shrink-0 text-ink/25 transition-all duration-300 ease-silk group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rose-gold"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
