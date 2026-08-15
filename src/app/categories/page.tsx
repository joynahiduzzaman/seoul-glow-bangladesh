import { prisma } from "@/server/db";
import Link from "next/link";
import type { Metadata } from "next";
import CategoryDirectory from "@/components/CategoryDirectory";
import { SITE_URL } from "@/lib/site-url";

// ISR, matching the other catalogue pages.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop Korean Skincare by Category",
  description:
    "Every Korean skincare category we stock — cleansers, toners, serums, ampoules, sunscreen, masks and more. Imported directly from South Korea and batch-verified.",
  alternates: { canonical: `${SITE_URL}/categories` },
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      // Only ACTIVE products count, matching what /shop?category= will render.
      // An unfiltered count promised products the shop grid then didn't show.
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  const items = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    productCount: c._count.products,
  }));

  return (
    <div className="bg-cream">
      {/* Visually hidden for the same reason as /brands: the page still needs a
          heading for screen readers and the target search engines pair with the
          title and canonical, without a block of preamble above the grid. */}
      <h1 className="sr-only">Shop Korean Skincare by Category</h1>

      {/* Bottom padding stays small — the footer already carries a global
          mt-16/mt-24, and a full pb here would stack on top of it. */}
      <section className="container-px mx-auto pb-6 pt-10 sm:pb-8 sm:pt-14">
        {items.length === 0 ? (
          <p className="py-20 text-center text-body">No categories have been added yet.</p>
        ) : (
          <CategoryDirectory categories={items} />
        )}

        <div className="mt-14 border-t border-border-soft pt-10 text-center sm:mt-20 sm:pt-12">
          <p className="text-sm text-body">Looking for a particular label instead?</p>
          <Link
            href="/brands"
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-semibold text-ink transition-colors duration-300 hover:border-rose-gold hover:text-rose-gold-text"
          >
            Browse all brands
          </Link>
        </div>
      </section>
    </div>
  );
}
