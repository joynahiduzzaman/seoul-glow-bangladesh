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
      // Counted with the same filter the brand page renders with, so a tile
      // never promises products that the page it opens won't show.
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
      // Fallback tile art for a brand whose logo has not been uploaded yet.
      products: { where: { status: "ACTIVE" }, select: { images: true }, take: 1 },
    },
  });

  const stocked = brands.filter((b) => b._count.products > 0);

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
      {/* The page still needs one h1: it is the document's heading for screen
          readers and the target search engines pair with the title and canonical
          on this route. The visual masthead was removed, not the heading. */}
      <h1 className="sr-only">Our Korean Beauty Brands</h1>

      {/* ── Directory ─────────────────────────────────────────────────────── */}
      {/* Bottom padding is deliberately small: the footer already carries a
          global mt-16/mt-24, and a full pb here stacked on top of it left ~176px
          of empty page between the last control and the footer. */}
      <section className="container-px mx-auto pb-6 pt-10 sm:pb-8 sm:pt-14">
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


