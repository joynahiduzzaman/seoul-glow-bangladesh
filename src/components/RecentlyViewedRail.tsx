"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";
import ProductCard from "./ProductCard";

export default function RecentlyViewedRail({
  excludeId,
  title = "Recently Viewed",
  showEmptyState = false,
  compact = false,
}: {
  excludeId?: string;
  title?: string;
  showEmptyState?: boolean;
  compact?: boolean;
}) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(getRecentlyViewed(excludeId));
    setLoaded(true);
  }, [excludeId]);

  // Product page usage (showEmptyState=false, the default) still renders nothing
  // until there's real data — unchanged from before. The dashboard opts into a
  // proper empty state instead of just disappearing.
  if (items.length === 0) {
    if (!showEmptyState || !loaded) return null;
    return (
      <div className="text-center py-10">
        <Eye size={22} className="text-ink/20 mx-auto mb-3" />
        <p className="text-sm text-ink/70 mb-4">Products you view will show up here.</p>
        <Link href="/shop" className="link-tap text-sm text-rose-gold-text hover:underline">Start Browsing</Link>
      </div>
    );
  }

  const grid = (
    <div className={`grid grid-cols-2 ${compact ? "" : "md:grid-cols-4"} gap-6`}>
      {items.slice(0, compact ? 2 : 4).map((item) => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );

  // Compact mode is meant to sit inside a card the parent page already renders
  // (e.g. the account dashboard) — no outer section/heading chrome, just the grid.
  if (compact) return grid;

  return (
    <section className="container-px mx-auto section-py">
      <h2 className="section-title mb-8">{title}</h2>
      {grid}
    </section>
  );
}
