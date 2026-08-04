import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { Metadata } from "next";

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
  return { title: `${brand.name} — Korean Skincare`, description: brand.story || undefined };
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await getBrand(params.slug);
  if (!brand) return notFound();

  const bestSellers = brand.products.filter((p) => p.isBestSeller);
  const newProducts = brand.products.filter((p) => p.isNewArrival);

  return (
    <div>
      <div className="relative h-56 md:h-72 bg-beige overflow-hidden">
        {brand.banner && <img src={brand.banner} alt={brand.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-ink/40 flex items-end">
          <div className="container-px mx-auto pb-8">
            <h1 className="font-display text-4xl md:text-5xl text-white font-semibold">{brand.name}</h1>
          </div>
        </div>
      </div>

      <div className="container-px mx-auto py-10 space-y-14">
        {brand.story && (
          <section className="max-w-2xl">
            <h2 className="font-display text-2xl mb-3">Brand Story</h2>
            <p className="text-ink/70 leading-relaxed">{brand.story}</p>
          </section>
        )}

        {bestSellers.length > 0 && (
          <section>
            <h2 className="section-title mb-6">Best Sellers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {bestSellers.map((p) => <ProductCard key={p.id} product={p as any} />)}
            </div>
          </section>
        )}

        {newProducts.length > 0 && (
          <section>
            <h2 className="section-title mb-6">New Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newProducts.map((p) => <ProductCard key={p.id} product={p as any} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="section-title mb-6">All {brand.name} Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {brand.products.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
