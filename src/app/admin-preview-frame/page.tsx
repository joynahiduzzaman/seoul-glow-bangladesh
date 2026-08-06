"use client";

import { useEffect, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { normalizeDesignSettings } from "@/lib/section-design";
import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedSplit from "@/components/FeaturedSplit";
import ProductRail from "@/components/ProductRail";
import BestSellerSpotlight from "@/components/BestSellerSpotlight";
import FeaturedBrands from "@/components/FeaturedBrands";
import TrendingShelf from "@/components/TrendingShelf";
import WhyChooseUsEditorial from "@/components/WhyChooseUsEditorial";
import TestimonialsSection from "@/components/TestimonialsSection";
import BlogPreviewSection from "@/components/BlogPreviewSection";
import InstagramSection from "@/components/InstagramSection";
import Newsletter from "@/components/Newsletter";
import CustomBanner from "@/components/CustomBanner";

const ADMIN_DICT = getDictionary("en");

const FLAG_BY_KEY: Record<string, string> = {
  featuredProducts: "isFeatured",
  flashSale: "isFlashSale",
  bestSellers: "isBestSeller",
  newArrivals: "isNewArrival",
  trending: "isTrending",
};
const PRODUCT_SECTIONS = Object.keys(FLAG_BY_KEY);

/**
 * Rendered inside an <iframe> by SectionPreview (src/components/admin/homepage/
 * SectionPreview.tsx) — its own separate browsing context is what makes the
 * Desktop/Tablet/Mobile toggle genuinely accurate: Tailwind's responsive
 * classes key off the iframe's OWN viewport width (set via the iframe element's
 * width), not just a scaled-down div in the same document. Lives outside
 * /admin so it isn't wrapped in the admin dashboard shell — it still gets the
 * real site's Header/Footer from the root layout, which is exactly what you
 * want in a homepage-section preview: full in-context, not just an isolated
 * component. Protected by the same middleware rule as every /admin* route
 * (see middleware.ts's `pathname.startsWith("/admin")` check).
 */
export default function PreviewFramePage() {
  const [sectionKey, setSectionKey] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "seoulglow-preview-update") return;
      setSectionKey(e.data.sectionKey);
      setSettings(e.data.settings || {});
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "seoulglow-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: "seoulglow-preview-height", height: document.documentElement.scrollHeight }, window.location.origin);
    });
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  const mode = settings.mode || "auto";

  useEffect(() => {
    if (!sectionKey) return;
    if (sectionKey === "hero" || sectionKey === "blog" || sectionKey.startsWith("customBanner:")) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (PRODUCT_SECTIONS.includes(sectionKey)) {
      params.set("type", "products");
      params.set("mode", mode);
      if (mode === "manual") params.set("ids", (settings.productIds || []).join(","));
      params.set("filter", FLAG_BY_KEY[sectionKey]);
      params.set("limit", String(settings.productLimit || 8));
    } else if (sectionKey === "categories") {
      params.set("type", "categories");
      params.set("mode", mode);
      if (mode === "manual") params.set("ids", (settings.categoryIds || []).join(","));
      params.set("limit", String(settings.limit || 6));
    } else if (sectionKey === "brandShowcase") {
      params.set("type", "brands");
      params.set("mode", mode);
      if (mode === "manual") params.set("ids", (settings.brandIds || []).join(","));
      params.set("limit", String(settings.limit || 6));
    } else if (sectionKey === "testimonials") {
      params.set("type", "reviews");
      params.set("limit", String(settings.limit || 3));
    } else {
      setLoading(false);
      return;
    }
    fetch(`/api/admin/homepage-sections/preview-data?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey, mode, JSON.stringify(settings.productIds), JSON.stringify(settings.categoryIds), JSON.stringify(settings.brandIds), settings.productLimit, settings.limit]);

  if (!sectionKey) {
    return <div ref={containerRef} className="min-h-[200px]" />;
  }

  const bg = normalizeDesignSettings(settings.design).backgroundColor || undefined;

  function renderContent() {
    if (sectionKey === "hero") return <Hero dict={ADMIN_DICT} overrides={settings} />;
    if (sectionKey!.startsWith("customBanner:")) {
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
    if (loading) return <div className="h-40 flex items-center justify-center text-sm text-ink/70">Loading preview…</div>;

    switch (sectionKey) {
      case "categories":
        return (
          <CategoryGrid dict={ADMIN_DICT} categories={data?.categories || []} title={settings.title} subtitle={settings.subtitle} columns={settings.columns || 6} backgroundColor={bg} />
        );
      case "featuredProducts":
        return (
          <FeaturedSplit
            dict={ADMIN_DICT}
            products={data?.products || []}
            title={settings.title}
            subtitle={settings.subtitle}
            showViewAll={settings.showViewAll !== false}
            viewAllText={settings.viewAllText}
            viewAllUrl={settings.viewAllUrl}
            backgroundColor={bg}
          />
        );
      case "flashSale":
        return (
          <ProductRail
            title={settings.title || "Flash Sale"}
            subtitle={settings.subtitle}
            href="#"
            products={data?.products || []}
            showCountdown={settings.showCountdown !== false}
            showViewAll={settings.showViewAll !== false}
            viewAllText={settings.viewAllText}
            backgroundColor={bg}
          />
        );
      case "bestSellers":
        return (
          <BestSellerSpotlight
            dict={ADMIN_DICT}
            products={data?.products || []}
            title={settings.title}
            subtitle={settings.subtitle}
            showViewAll={settings.showViewAll !== false}
            viewAllText={settings.viewAllText}
            viewAllUrl={settings.viewAllUrl}
            backgroundColor={bg}
          />
        );
      case "brandShowcase":
        return <FeaturedBrands brands={data?.brands || []} title={settings.title} subtitle={settings.subtitle} backgroundColor={bg} />;
      case "newArrivals":
        return (
          <ProductRail
            title={settings.title || "New Arrivals"}
            subtitle={settings.subtitle}
            href="#"
            products={data?.products || []}
            showViewAll={settings.showViewAll !== false}
            viewAllText={settings.viewAllText}
            backgroundColor={bg}
          />
        );
      case "trending":
        return (
          <TrendingShelf
            dict={ADMIN_DICT}
            products={data?.products || []}
            title={settings.title}
            subtitle={settings.subtitle}
            showViewAll={settings.showViewAll !== false}
            viewAllText={settings.viewAllText}
            viewAllUrl={settings.viewAllUrl}
            backgroundColor={bg}
          />
        );
      case "authenticity":
        return <WhyChooseUsEditorial dict={ADMIN_DICT} title={settings.title} subtitle={settings.subtitle} backgroundColor={bg} />;
      case "testimonials":
        return (
          <TestimonialsSection reviews={data?.reviews || []} title={settings.title} subtitle={settings.subtitle} limit={settings.limit || 3} backgroundColor={bg} />
        );
      case "blog":
        return (
          <BlogPreviewSection
            title={settings.title}
            subtitle={settings.subtitle}
            postLimit={settings.postLimit || 3}
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
            postLimit={settings.postLimit || 6}
            backgroundColor={bg}
          />
        );
      case "newsletter":
        return (
          <Newsletter
            dict={ADMIN_DICT}
            title={settings.title}
            subtitle={settings.subtitle}
            buttonText={settings.buttonText}
            backgroundImage={settings.backgroundImage}
            backgroundColor={bg}
          />
        );
      default:
        return <p className="text-sm text-ink/70 p-6">No live preview available for this section.</p>;
    }
  }

  return <div ref={containerRef}>{renderContent()}</div>;
}
