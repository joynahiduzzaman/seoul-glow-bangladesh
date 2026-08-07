import { prisma } from "@/server/db";
import Link from "next/link";
import type { Metadata } from "next";
import BrandCard from "@/components/BrandCard";
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
            scrolling, which defeats the point of a directory. */}
        <div className="container-px mx-auto py-10 text-center sm:py-16 lg:py-20">
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
      <section className="container-px mx-auto py-12 sm:py-16">
        {items.length === 0 ? (
          <p className="py-20 text-center text-body">No brands have been added yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:gap-6">
            {items.map((brand, i) => (
              <li key={brand.id}>
                {/* The first row is above the fold on every breakpoint, so those
                    marks are the LCP candidates. */}
                <BrandCard brand={brand} priority={i < 4} />
              </li>
            ))}
          </ul>
        )}

        {stocked.length > 0 && (
          <div className="mt-12 text-center sm:mt-16">
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

