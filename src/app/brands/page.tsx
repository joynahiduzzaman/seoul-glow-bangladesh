import { prisma } from "@/server/db";
import Link from "next/link";
import type { Metadata } from "next";
import BrandDirectory from "@/components/BrandDirectory";
import { SITE_URL } from "@/lib/site-url";
import { parseJsonArray } from "@/lib/utils";

// ISR, matching the other catalogue pages: the brand list changes rarely, and a
// stale-by-a-minute directory is cheaper than a query on every visit.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Korean Skincare Brands",
  description:
    "Every Korean beauty label we stock — COSRX, Beauty of Joseon, Anua, Laneige, Innisfree and more. Imported directly from South Korea and batch-verified.",
  alternates: { canonical: `${SITE_URL}/brands` },
};

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      country: true,
      _count: { select: { products: true } },
      // Fallback tile art for a brand whose logo has not been uploaded yet.
      products: { select: { images: true }, take: 1 },
    },
  });

  const stocked = brands.filter((b) => b._count.products > 0);
  const totalProducts = brands.reduce((n, b) => n + b._count.products, 0);

  const items = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: b.logo,
    country: b.country,
    productCount: b._count.products,
    image: parseJsonArray(b.products[0]?.images)[0] ?? null,
  }));

  return (
    <div className="bg-cream">
      {/* ── Masthead ──────────────────────────────────────────────────────── */}
      <section className="border-b border-border-soft bg-gradient-to-b from-beige/70 via-cream to-cream">
        {/* Kept short on a phone: at the full section rhythm this masthead filled
            the entire first screen and not one brand was visible without
            scrolling, which defeats the point of a directory.
            The bottom padding is also deliberately smaller than the top — paired
            with the section below it was leaving a 145px empty band around the
            divider, which read as a gap rather than a break. */}
        <div className="container-px mx-auto pb-9 pt-10 text-center sm:pb-12 sm:pt-16 lg:pb-14 lg:pt-20">
          <p className="eyebrow mb-3">Authorised Korean Labels</p>
          <h1 className="section-title mx-auto max-w-2xl break-words">Our Korean Beauty Brands</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body sm:text-[15px]">
            Every label we stock, imported directly from South Korea and batch-verified — never grey-market.
            Choose a brand to see its full range.
          </p>

          {/* gap-x-5 on mobile so all three sit on one line at 320px; at gap-x-8
              they needed 292px of a 288px row and broke 2-then-1. */}
          <dl className="mx-auto mt-7 flex max-w-md items-start justify-center gap-x-5 sm:mt-8 sm:gap-x-12">
            <Stat value={brands.length} label={brands.length === 1 ? "Brand" : "Brands"} />
            <Stat value={totalProducts} label={totalProducts === 1 ? "Product" : "Products"} />
            <Stat value="100%" label="Authentic" />
          </dl>
        </div>
      </section>

      {/* ── Directory ─────────────────────────────────────────────────────── */}
      {/* Less padding above than below: the index belongs to the grid it filters,
          so it sits nearer the divider than the footer does. */}
      {/* Bottom padding is deliberately small: the footer already carries a
          global mt-16/mt-24, and a full pb here stacked on top of it left ~176px
          of empty page between the last control and the footer. */}
      <section className="container-px mx-auto pb-6 pt-9 sm:pb-8 sm:pt-11">
        {items.length === 0 ? (
          <p className="py-20 text-center text-body">No brands have been added yet.</p>
        ) : (
          <BrandDirectory brands={items} />
        )}

        {stocked.length > 0 && (
          // A wider gap than anything inside the directory: this is a way out of
          // the page, not part of it.
          <div className="mt-14 border-t border-border-soft pt-10 text-center sm:mt-20 sm:pt-12">
            <p className="text-sm text-body">Prefer to browse everything at once?</p>
            <Link
              href="/shop"
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-semibold text-ink transition-colors duration-300 hover:border-rose-gold hover:text-rose-gold-text"
            >
              Shop all products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-2xl font-semibold text-ink sm:text-3xl">{value}</span>
        <span className="mt-0.5 block whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em] text-ink/50 sm:text-[11px] sm:tracking-[0.18em]">
          {label}
        </span>
      </dd>
    </div>
  );
}

