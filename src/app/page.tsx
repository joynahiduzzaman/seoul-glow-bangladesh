import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getEnabledHomepageSections } from "@/server/homepage";
import { parseSettings } from "@/lib/homepage-sections";
import { normalizeDesignSettings, wrapperStyle } from "@/lib/section-design";
import { parseJsonArray } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";

import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedSplit from "@/components/FeaturedSplit";
import ProductRail from "@/components/ProductRail";
import BestSellerSpotlight from "@/components/BestSellerSpotlight";
import FeaturedBrands from "@/components/FeaturedBrands";
import TrendingShelf from "@/components/TrendingShelf";
import WhyChooseUsEditorial from "@/components/WhyChooseUsEditorial";
import TestimonialsSection from "@/components/TestimonialsSection";
import RecentlyViewedRail from "@/components/RecentlyViewedRail";
import BlogPreviewSection from "@/components/BlogPreviewSection";
import InstagramSection from "@/components/InstagramSection";
import Newsletter from "@/components/Newsletter";
import CustomBanner from "@/components/CustomBanner";

export const revalidate = 60;

// Same cached product-section fetcher as before the Homepage Builder existed —
// now also takes the take-count from a section's settings (productLimit) instead
// of a hardcoded number per call site. Used for every section's "auto" mode.
const getSection = unstable_cache(
  async (where: any, take = 8) => {
    return prisma.product.findMany({
      where: { ...where, status: "ACTIVE" },
      take,
      include: { brand: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
  ["home-product-section"],
  { revalidate: 60 }
);

// "Manual" mode for any product rail — an admin-picked list of product IDs,
// returned in the order they were picked (Prisma's `in` filter doesn't preserve
// array order, so it's restored here after the fetch).
const getProductsByIds = unstable_cache(
  async (ids: string[]) => {
    if (ids.length === 0) return [];
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      include: { brand: { select: { name: true, slug: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is (typeof products)[number] => Boolean(p));
  },
  ["home-products-by-ids"],
  { revalidate: 60 }
);

async function resolveProducts(settings: Record<string, any>, autoWhere: any, defaultLimit: number) {
  const limit = settings.productLimit || defaultLimit;
  if (settings.mode === "manual" && Array.isArray(settings.productIds) && settings.productIds.length > 0) {
    return (await getProductsByIds(settings.productIds)).slice(0, limit);
  }
  return getSection(autoWhere, limit);
}

const getAllCategories = unstable_cache(
  // The product count is carried so the homepage tiles read the same as the
  // ones in the /categories directory, which show it.
  async () => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, image: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return categories.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  },
  ["home-all-categories"],
  { revalidate: 60 }
);

const getAllBrands = unstable_cache(
  async () => {
    // Every brand now has a logo uploaded, so the tile leads with the mark. One
    // in-stock product image is still pulled per brand as the fallback visual,
    // so a newly added brand never renders as an empty tile before its logo
    // arrives — that is what these tiles showed back when no logos existed.
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        _count: { select: { products: true } },
        products: {
          where: { status: "ACTIVE", images: { not: "[]" } },
          orderBy: [{ isBestSeller: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { images: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return brands.map(({ products, _count, ...brand }) => ({
      ...brand,
      productCount: _count.products,
      image: parseJsonArray(products[0]?.images)[0] ?? null,
    }));
  },
  ["home-all-brands"],
  { revalidate: 60 }
);

const getTopReviews = unstable_cache(
  async () => {
    return prisma.review.findMany({
      where: { rating: { gte: 4 } },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    });
  },
  ["home-top-reviews"],
  { revalidate: 60 }
);

/**
 * Renders one enabled homepage section. Returns null for a section whose data
 * ended up empty (e.g. no flash-sale products right now) — each component below
 * already handles its own empty state (most return null themselves), this is
 * just the dispatch point from sectionKey -> component + the data it needs.
 *
 * `settings.title`/`settings.subtitle` are the canonical heading override keys
 * going forward; `settings.heading` (the old flashSale/newArrivals key, before
 * this file supported a generic title field) is still read as a fallback so any
 * previously-configured site keeps showing its custom heading unchanged.
 */
async function renderSection(section: { sectionKey: string; settings: string }, dict: Dictionary): Promise<React.ReactNode> {
  const settings = parseSettings(section.settings);
  const heading = (key: string, fallback: string) => settings.title || settings.heading || fallback;
  const bg = normalizeDesignSettings(settings.design).backgroundColor || undefined;

  if (section.sectionKey.startsWith("customBanner:")) {
    return (
      <CustomBanner
        title={settings.title}
        subtitle={settings.subtitle}
        image={settings.image}
        buttonText={settings.buttonText}
        buttonUrl={settings.buttonUrl}
        textAlign={settings.textAlign || "left"}
        backgroundColor={bg}
      />
    );
  }

  switch (section.sectionKey) {
    case "hero": {
      return <Hero dict={dict} overrides={settings} />;
    }
    case "categories": {
      const all = await getAllCategories();
      const limit = settings.limit || 6;
      const categories =
        settings.mode === "manual" && Array.isArray(settings.categoryIds) && settings.categoryIds.length > 0
          ? settings.categoryIds
              .map((id: string) => all.find((c) => c.id === id))
              .filter((c: typeof all[number] | undefined): c is typeof all[number] => Boolean(c))
              .slice(0, limit)
          : // Auto mode showed the first six categories alphabetically, which put
            // tiles reading "0 PRODUCTS" on the homepage — each one a click to an
            // empty shelf. Stocked categories come first now; empty ones only fill
            // the row if there aren't enough, so the section never shrinks.
            [...all].sort((a, b) => Number(b.productCount > 0) - Number(a.productCount > 0)).slice(0, limit);
      return (
        <CategoryGrid
          dict={dict}
          categories={categories}
          title={settings.title}
          subtitle={settings.subtitle}
          columns={settings.columns || 6}
          backgroundColor={bg}
        />
      );
    }
    case "featuredProducts": {
      const products = await resolveProducts(settings, { isFeatured: true }, 4);
      return products.length > 0 ? (
        <FeaturedSplit
          dict={dict}
          products={products}
          title={settings.title}
          subtitle={settings.subtitle}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          viewAllUrl={settings.viewAllUrl}
          backgroundColor={bg}
        />
      ) : null;
    }
    case "flashSale": {
      const products = await resolveProducts(settings, { isFlashSale: true }, 8);
      return products.length > 0 ? (
        <ProductRail
          title={heading("flashSale", "Flash Sale")}
          eyebrow="Limited Time"
          subtitle={settings.subtitle}
          description="Discounted while the timer runs. Prices go back up when it does."
          href={settings.viewAllUrl || "/shop?filter=flashsale"}
          products={products}
          showCountdown={settings.showCountdown !== false}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          backgroundColor={bg}
        />
      ) : null;
    }
    case "bestSellers": {
      const products = await resolveProducts(settings, { isBestSeller: true }, 4);
      return products.length > 0 ? (
        <BestSellerSpotlight
          dict={dict}
          products={products}
          title={settings.title}
          subtitle={settings.subtitle}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          viewAllUrl={settings.viewAllUrl}
          backgroundColor={bg}
        />
      ) : null;
    }
    case "brandShowcase": {
      const all = await getAllBrands();
      const limit = settings.limit || 6;
      const brands =
        settings.mode === "manual" && Array.isArray(settings.brandIds) && settings.brandIds.length > 0
          ? settings.brandIds
              .map((id: string) => all.find((b) => b.id === id))
              .filter((b: typeof all[number] | undefined): b is typeof all[number] => Boolean(b))
              .slice(0, limit)
          : all.slice(0, limit);
      return <FeaturedBrands brands={brands} title={settings.title} subtitle={settings.subtitle} backgroundColor={bg} />;
    }
    case "newArrivals": {
      const products = await resolveProducts(settings, { isNewArrival: true }, 8);
      return products.length > 0 ? (
        <ProductRail
          title={heading("newArrivals", "New Arrivals")}
          eyebrow="Just Landed"
          subtitle={settings.subtitle}
          description="Fresh off the shipment from Seoul, before it sells through."
          href={settings.viewAllUrl || "/shop?filter=new"}
          products={products}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          backgroundColor={bg}
        />
      ) : null;
    }
    case "trending": {
      const products = await resolveProducts(settings, { isTrending: true }, 8);
      return products.length > 0 ? (
        <TrendingShelf
          dict={dict}
          products={products}
          title={settings.title}
          subtitle={settings.subtitle}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          viewAllUrl={settings.viewAllUrl}
          backgroundColor={bg}
        />
      ) : null;
    }
    case "authenticity":
      return <WhyChooseUsEditorial dict={dict} title={settings.title} subtitle={settings.subtitle} backgroundColor={bg} />;
    case "testimonials": {
      const topReviews = await getTopReviews();
      return topReviews.length > 0 ? (
        <TestimonialsSection reviews={topReviews} title={settings.title} subtitle={settings.subtitle} limit={settings.limit || 3} backgroundColor={bg} />
      ) : null;
    }
    case "recentlyViewed":
      return <RecentlyViewedRail title={settings.title || "Recently Viewed"} />;
    case "blog":
      return (
        <BlogPreviewSection
          title={settings.title}
          subtitle={settings.subtitle}
          mode={settings.mode || "auto"}
          postSlugs={settings.postSlugs || []}
          showViewAll={settings.showViewAll !== false}
          viewAllText={settings.viewAllText}
          viewAllUrl={settings.viewAllUrl}
          backgroundColor={bg}
        />
      );
    case "instagram":
      return (
        <InstagramSection
          title={settings.title}
          subtitle={settings.subtitle}
          handle={settings.handle}
          backgroundColor={bg}
        />
      );
    case "newsletter":
      return (
        <Newsletter
          dict={dict}
          title={settings.title}
          subtitle={settings.subtitle}
          buttonText={settings.buttonText}
          backgroundImage={settings.backgroundImage}
          backgroundColor={bg}
        />
      );
    default:
      // A sectionKey with no known renderer (e.g. a stale row from an older
      // config) is skipped rather than crashing the whole homepage.
      return null;
  }
}

export default async function HomePage() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const sections = await getEnabledHomepageSections();

  const rendered = await Promise.all(
    sections.map(async (section) => {
      const settings = parseSettings(section.settings);
      const design = normalizeDesignSettings(settings.design);
      return {
        key: section.sectionKey,
        node: await renderSection(section, dict),
        style: wrapperStyle(design),
      };
    })
  );

  return <div>{rendered.map(({ key, node, style }) => (node ? <div key={key} style={style}>{node}</div> : null))}</div>;
}
