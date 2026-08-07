import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import { formatBDT, discountedPrice, parseJsonArray, safeJsonLd } from "@/lib/utils";
import ProductMediaTabs from "@/components/ProductMediaTabs";
import AddToCartPanel from "@/components/AddToCartPanel";
import StickyAddToCart from "@/components/StickyAddToCart";
import ProductTrustRow from "@/components/ProductTrustRow";
import ProductBenefits from "@/components/ProductBenefits";
import IngredientHighlights from "@/components/IngredientHighlights";
import BuildYourRoutine, { type RoutineStep } from "@/components/BuildYourRoutine";
import ReviewCard from "@/components/ReviewCard";
import ProductCard from "@/components/ProductCard";
import RecordRecentlyViewed from "@/components/RecordRecentlyViewed";
import RecentlyViewedRail from "@/components/RecentlyViewedRail";
import FrequentlyBoughtTogether from "@/components/FrequentlyBoughtTogether";
import ProductFaq from "@/components/ProductFaq";
import { Star, ShieldCheck, Droplet, Target, AlertTriangle } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { ROUTINE_STEPS } from "@/lib/routine";

export const revalidate = 60; // ISR: catalog pages regenerate at most once a minute instead of on every request

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  // Draft products are only visible in the admin panel — treat them as not-found
  // on the public storefront rather than a partially-rendered "coming soon" page.
  if (!product || product.status === "DRAFT") return null;
  return product;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      images: parseJsonArray(product.images).slice(0, 1),
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  // "Build Your Routine" — one product per step of the canonical Cleanser →
  // Toner → Serum → Moisturizer → Sunscreen sequence. If this product itself is
  // one of those steps, it fills that slot (no point recommending a second
  // cleanser); otherwise the step prefers same-brand for cohesion, falling back
  // to a bestseller, then anything in stock in that category. A single query
  // for all routine-category candidates avoids an N+1 across the 5 steps.
  //
  // Related products and the routine category lookup only depend on `product`,
  // so they share one round-trip instead of running back to back.
  const [related, routineCategories] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId: product.categoryId, status: "ACTIVE", NOT: { id: product.id } },
      take: 4,
      include: { brand: { select: { name: true, slug: true } } },
    }),
    prisma.category.findMany({
      where: { slug: { in: ROUTINE_STEPS.map((s) => s.slug) } },
    }),
  ]);
  const routineCandidates = await prisma.product.findMany({
    where: { categoryId: { in: routineCategories.map((c) => c.id) }, status: "ACTIVE", stock: { gt: 0 } },
    include: { brand: { select: { name: true } } },
  });
  const routineSteps: RoutineStep[] = ROUTINE_STEPS.map((step): RoutineStep | null => {
    const category = routineCategories.find((c) => c.slug === step.slug);
    if (!category) return null;
    if (category.id === product.categoryId) {
      return { slug: step.slug, label: step.label, isCurrentProduct: true, product: { ...product, brand: { name: product.brand.name } } };
    }
    const inCategory = routineCandidates.filter((p) => p.categoryId === category.id);
    const pick = inCategory.find((p) => p.brandId === product.brandId) || inCategory.find((p) => p.isBestSeller) || inCategory[0];
    return pick ? { slug: step.slug, label: step.label, isCurrentProduct: false, product: pick } : null;
  }).filter((s): s is RoutineStep => Boolean(s));

  const images = parseJsonArray(product.images);
  const images360 = parseJsonArray(product.images360);
  const skinType = parseJsonArray(product.skinType);
  const skinConcern = parseJsonArray(product.skinConcern);
  const benefits = parseJsonArray(product.benefits);
  const ingredientList = product.ingredients
    ? product.ingredients.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const finalPrice = discountedPrice(product.price, product.discountPercent);
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: finalPrice,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(avgRating && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: product.reviews.length },
    }),
  };

  return (
    <div className="container-px mx-auto py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <RecordRecentlyViewed
        id={product.id}
        name={product.name}
        slug={product.slug}
        price={product.price}
        discountPercent={product.discountPercent}
        images={product.images}
        stock={product.stock}
        brand={{ name: product.brand.name, slug: product.brand.slug }}
      />

      <nav className="text-xs text-ink/70 mb-8">
        Shop / {product.category.name} / <span className="text-ink/70">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <ProductMediaTabs images={images} images360={images360} name={product.name} />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-olive font-semibold mb-3">{product.brand.name}</p>
          <h1 className="font-display text-4xl font-semibold text-ink mb-2 leading-tight">{product.name}</h1>
          {product.koreanName && <p className="text-sm text-ink/70 italic mb-4">{product.koreanName}</p>}

          {avgRating && (
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={15} className={i < Math.round(avgRating) ? "fill-rose-gold text-rose-gold" : "text-ink/15"} />
                ))}
              </div>
              <span className="text-sm text-ink/70">{avgRating.toFixed(1)} ({product.reviews.length} reviews)</span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <span className="font-display text-3xl font-semibold text-ink">{formatBDT(finalPrice)}</span>
            {product.discountPercent > 0 && (
              <>
                <span className="text-ink/70 line-through">{formatBDT(product.price)}</span>
                <span className="text-xs bg-badge-sale text-white rounded-full px-2.5 py-1 font-semibold">-{product.discountPercent}%</span>
              </>
            )}
          </div>

          <p className="text-ink/70 leading-relaxed mb-6">{product.description}</p>

          {(skinType.length > 0 || skinConcern.length > 0) && (
            <div className="space-y-3 mb-6">
              {skinType.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Droplet size={14} className="text-pastel-green shrink-0 mt-1" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-body mr-1">Skin Type:</span>
                    {skinType.map((s) => (
                      <span key={s} className="text-xs bg-pastel-green/30 border border-pastel-green rounded-full px-3 py-1 font-medium capitalize">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {skinConcern.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Target size={14} className="text-rose-gold shrink-0 mt-1" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-body mr-1">Targets:</span>
                    {skinConcern.map((s) => (
                      <span key={s} className="text-xs bg-soft-pink/40 border border-soft-pink rounded-full px-3 py-1 font-medium capitalize">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div id="main-add-to-cart">
            <AddToCartPanel
              productId={product.id}
              name={product.name}
              slug={product.slug}
              image={images[0] || ""}
              price={finalPrice}
              stock={product.stock}
              brandName={product.brand.name}
            />
          </div>

          {/* Sits with the buy controls: the reasons to want it belong beside
              the decision, not a screen below it. */}
          <ProductBenefits benefits={benefits} />
        </div>
      </div>

      <StickyAddToCart
        productId={product.id}
        name={product.name}
        slug={product.slug}
        image={images[0] || ""}
        price={finalPrice}
        stock={product.stock}
      />

      {/* The shipping and authenticity promises, once the product itself has
          been made the case for. */}
      <ProductTrustRow />

      {/* Editorial storytelling block — "The Ritual" */}
      {product.howToUse && (
        <section className="mt-14 md:mt-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold mb-3">The Ritual</p>
            <h2 className="font-display text-3xl font-semibold mb-4">How to Use</h2>
            <p className="text-ink/70 leading-relaxed">{product.howToUse}</p>
          </div>
          <div className="order-1 md:order-2 relative aspect-[4/3] rounded-xl2 overflow-hidden">
            {images[1] || images[0] ? (
              <Image src={images[1] || images[0]} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            ) : null}
          </div>
        </section>
      )}

      <IngredientHighlights ingredients={ingredientList} />

      {/* Warnings were stored on the model but never shown anywhere. For
          skincare that is the one field a customer with sensitive skin or an
          allergy actually looks for, so it sits directly under the ingredients
          rather than in a footnote. */}
      {product.warnings && (
        <section className="mt-10 md:mt-14">
          <div className="mx-auto flex max-w-3xl items-start gap-3.5 rounded-xl2 border border-gold/25 bg-gold/[0.06] px-5 py-4 sm:px-6">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-text" aria-hidden="true">
              <AlertTriangle size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink/70">Before you use it</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-body">{product.warnings}</p>
            </div>
          </div>
        </section>
      )}

      {/* Authenticity verification */}
      <section className="mt-14 md:mt-20 max-w-2xl mx-auto">
        <div className="card-surface p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
            <ShieldCheck size={26} />
          </span>
          <div>
            <h3 className="font-display text-xl mb-1">Authenticity Verified</h3>
            <p className="text-sm text-ink/70">
              Country of Origin: <strong className="text-ink">{product.countryOfOrigin}</strong> · Batch: <strong className="text-ink">{product.batchNumber}</strong> · Code: <strong className="text-ink">{product.authenticityCode}</strong>
            </p>
          </div>
        </div>
      </section>

      <BuildYourRoutine steps={routineSteps} currentProductId={product.id} />

      <FrequentlyBoughtTogether
        items={[
          { id: product.id, name: product.name, slug: product.slug, price: product.price, discountPercent: product.discountPercent, images: product.images, stock: product.stock },
          ...related.slice(0, 2).map((p) => ({ id: p.id, name: p.name, slug: p.slug, price: p.price, discountPercent: p.discountPercent, images: p.images, stock: p.stock })),
        ]}
      />

      <ProductFaq />

      {product.reviews.length > 0 && (
        <section className="mt-14 md:mt-20 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl mb-8 text-center">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-14 md:mt-20">
          <h2 className="font-display text-2xl mb-8 text-center">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewedRail excludeId={product.id} />
    </div>
  );
}
