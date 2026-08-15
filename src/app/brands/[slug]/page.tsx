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
    include: {
      // ACTIVE only. A draft or archived product has no shop page, so listing
      // it here produced a card that 404s — and made this page's count disagree
      // with the one on the /brands tile, which counts what it can show.
      products: {
        where: { status: "ACTIVE" },
        include: { brand: { select: { name: true, slug: true } } },
      },
    },
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
      {/*
        No photograph, deliberately.

        This was a full-bleed banner sitting under a 75%-ink wash. Three things
        were wrong with it. The photograph carried no information — it was
        atmosphere, and the wash needed to be that heavy precisely so the
        atmosphere wouldn't swallow the type. It fought the brand's own mark,
        which is the one thing on the page that genuinely identifies the label.
        And because the wash flattened every image to the same dark band, every
        brand page looked like every other brand page.

        What a visitor actually wants here is: whose page is this, where do they
        come from, how deep is the range, and what are they about. So the
        masthead is built from the shop's own material instead — cream paper, a
        warm halo, a hairline rule and type. It also loads nothing, which on a
        Bangladeshi mobile connection is worth more than a backdrop.

        brand.banner is still stored and still editable in the admin; this
        surface simply no longer renders it.
      */}
      {/* Warm at the top, settling into the cream the rest of the page uses. The
          white logo plate needs a tinted ground to read as a mounted plate
          rather than a hole. */}
      <section className="relative overflow-hidden border-b border-border-soft bg-gradient-to-b from-beige/50 via-cream to-cream">
        {/* A warm halo behind the logo plate — pure CSS, so it costs no request
            and can't crop badly on a phone the way a banner crop does. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[760px] max-w-[170%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(198,138,138,0.18), rgba(198,138,138,0))" }}
        />
        {/* A single hairline of brand colour along the top edge. The one piece
            of ornament in here, and the cheapest premium cue there is. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-gold/45 to-transparent"
        />

        <div className="container-px relative mx-auto pb-12 pt-14 sm:pb-16 sm:pt-20">
          <nav aria-label="Breadcrumb" className="mb-8 flex justify-center">
            <ol className="flex items-center gap-1.5 text-xs text-ink/55">
              <li><Link href="/" className="transition-colors hover:text-rose-gold-text">Home</Link></li>
              <ChevronRight size={12} aria-hidden="true" />
              <li><Link href="/brands" className="transition-colors hover:text-rose-gold-text">Brands</Link></li>
              <ChevronRight size={12} aria-hidden="true" />
              <li aria-current="page" className="font-medium text-ink/75">{brand.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col items-center text-center">
            {brand.logo && (
              // The plate stays white on a cream ground: these are transparent
              // marks drawn for a white surface, and a ring plus a soft shadow
              // is what makes it read as a mounted mark rather than a cut-out.
              <div className="mb-7 flex h-24 w-44 items-center justify-center rounded-xl2 bg-white p-4 shadow-e2 ring-1 ring-ink/[0.06] sm:h-28 sm:w-52 sm:p-5">
                <div className="relative h-full w-full">
                  <Image
                    src={trimmedLogoUrl(brand.logo)}
                    alt={`${brand.name} logo`}
                    fill
                    priority
                    sizes="208px"
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            {brand.country && (
              <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-gold-text">
                <MapPin size={12} aria-hidden="true" /> {brand.country}
              </p>
            )}

            <h1 className="font-display text-[32px] font-semibold leading-[1.1] text-ink sm:text-4xl md:text-5xl">
              {brand.name}
            </h1>

            {/* A short centred rule, not a full-width divider: it closes the
                name off from the copy without cutting the masthead in half. */}
            <span aria-hidden="true" className="mt-5 block h-px w-12 bg-rose-gold/50" />

            {brand.story && (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-body sm:text-[15px]">
                {brand.story}
              </p>
            )}

            {/* The count lives below the story now. It is a fact about the range,
                which is what the grid underneath is — so it belongs next to the
                grid, not stapled to the brand's name.

                A brand with nothing in it says "Coming soon", the same wording
                the /brands tile uses. "0 products" is technically true and reads
                as a bug. Nothing links here in that state any more, but the URL
                still resolves — someone's bookmark, a shared link, a crawler —
                and it should look deliberate when it does. */}
            {brand.products.length === 0 ? (
              <p className="mt-7 inline-flex items-center rounded-full bg-rose-gold/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-gold-text ring-1 ring-rose-gold/25">
                Coming soon
              </p>
            ) : (
              <p className="mt-7 inline-flex items-center rounded-full border border-ink/10 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/65">
                {brand.products.length} {brand.products.length === 1 ? "product" : "products"}
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
