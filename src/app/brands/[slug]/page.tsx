import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin } from "lucide-react";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { trimmedLogoUrl } from "@/lib/brand-logo";

export const revalidate = 60; // ISR: catalog pages regenerate at most once a minute instead of on every request

async function getBrand(slug: string) {
  return prisma.brand.findUnique({
    where: { slug },
    include: { products: { include: { brand: { select: { name: true, slug: true } } } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrand(params.slug);
  if (!brand) return {};
  return {
    title: `${brand.name} — Korean Skincare`,
    description: brand.story || undefined,
    alternates: { canonical: `${SITE_URL}/brands/${brand.slug}` },
  };
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await getBrand(params.slug);
  if (!brand) return notFound();

  const bestSellers = brand.products.filter((p) => p.isBestSeller);
  const newProducts = brand.products.filter((p) => p.isNewArrival);
  // Highlight rows only earn their place when they are a *selection*. With one
  // or two products per brand they repeated the same card two and three times
  // down the page, which read as a rendering fault rather than curation.
  const showHighlights = brand.products.length > 4;

  return (
    <div className="bg-cream">
      {/* ── Brand masthead ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-soft">
        {brand.banner ? (
          <>
            <Image
              src={brand.banner}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* The banner is atmosphere, not information: a heavy wash keeps the
                logo plate and type legible over whatever photograph is on file. */}
            <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/65 to-ink/80" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-beige via-cream to-soft-pink/40" />
        )}

        <div className="container-px relative mx-auto py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 flex justify-center">
            <ol className={`flex items-center gap-1.5 text-xs ${brand.banner ? "text-white/70" : "text-ink/55"}`}>
              <li><Link href="/" className="transition-colors hover:underline">Home</Link></li>
              <ChevronRight size={12} aria-hidden="true" />
              <li><Link href="/brands" className="transition-colors hover:underline">Brands</Link></li>
              <ChevronRight size={12} aria-hidden="true" />
              <li aria-current="page" className="font-medium">{brand.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col items-center text-center">
            {brand.logo && (
              // White plate for the same reason as the directory tiles: these are
              // transparent marks drawn for a white surface, and over a darkened
              // photograph they would otherwise disappear.
              <div className="mb-6 flex h-24 w-40 items-center justify-center rounded-xl2 bg-white p-4 shadow-e2 ring-1 ring-ink/5 sm:h-28 sm:w-48 sm:p-5">
                <div className="relative h-full w-full">
                  <Image
                    src={trimmedLogoUrl(brand.logo)}
                    alt={`${brand.name} logo`}
                    fill
                    priority
                    sizes="192px"
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            <h1
              className={`font-display text-3xl font-semibold sm:text-4xl md:text-5xl ${brand.banner ? "text-white" : "text-ink"}`}
            >
              {brand.name}
            </h1>

            <div className={`mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs ${brand.banner ? "text-white/75" : "text-ink/60"}`}>
              {brand.country && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} aria-hidden="true" /> {brand.country}
                </span>
              )}
              <span className="font-medium uppercase tracking-[0.14em]">
                {brand.products.length} {brand.products.length === 1 ? "product" : "products"}
              </span>
            </div>

            {brand.story && (
              <p
                className={`mt-6 max-w-2xl text-sm leading-relaxed sm:text-[15px] ${brand.banner ? "text-white/85" : "text-body"}`}
              >
                {brand.story}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container-px mx-auto space-y-14 py-12 sm:py-16">
        {brand.products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-xl">No products from {brand.name} yet</p>
            <p className="mt-2 text-sm text-body">They are on their way — browse the rest of the catalogue meanwhile.</p>
            <Link
              href="/shop"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-ink/15 px-7 text-sm font-semibold transition-colors hover:border-rose-gold hover:text-rose-gold-text"
            >
              Shop all products
            </Link>
          </div>
        ) : (
          <>
            {showHighlights && bestSellers.length > 0 && (
              <ProductSection title="Best Sellers" products={bestSellers} />
            )}
            {showHighlights && newProducts.length > 0 && (
              <ProductSection title="New Products" products={newProducts} />
            )}
            <ProductSection
              title={showHighlights ? `All ${brand.name} Products` : `${brand.name} Products`}
              products={brand.products}
            />
          </>
        )}

        <div className="border-t border-border-soft pt-10 text-center">
          <Link
            href="/brands"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-rose-gold-text"
          >
            Browse all brands
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductSection({ title, products }: { title: string; products: ProductCardData[] }) {
  return (
    <section>
      <h2 className="section-title mb-6">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 md:gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
