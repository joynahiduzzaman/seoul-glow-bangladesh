"use client";

import { useEffect, useState } from "react";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";
import ProductCard from "@/components/ProductCard";
import DashboardEmptyState from "@/components/account/DashboardEmptyState";
import { Eye } from "lucide-react";

export default function RecentlyViewedPage() {
  const [items, setItems] = useState<RecentlyViewedItem[] | null>(null);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items === null) {
    return <div className="animate-pulse h-40 bg-beige rounded-xl2" />;
  }

  if (items.length === 0) {
    return <DashboardEmptyState icon={Eye} message="Products you've viewed will show up here." ctaLabel="Browse Products" ctaHref="/shop" />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {items.map((item) => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );
}
