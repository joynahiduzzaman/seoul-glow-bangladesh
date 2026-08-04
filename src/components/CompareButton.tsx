"use client";

import { GitCompare } from "lucide-react";
import { useCompareStore, type CompareItem } from "@/lib/compare-store";

/** Icon-only toggle button — same visual language as ProductCard's wishlist
 * heart (glass circle, scale pop on toggle) so the two read as a matched pair
 * of quick actions rather than two different UI systems. */
export default function CompareButton({
  item,
  className = "",
  size = 16,
}: {
  item: CompareItem;
  className?: string;
  size?: number;
}) {
  const isComparing = useCompareStore((s) => s.isComparing(item.productId));
  const toggleItem = useCompareStore((s) => s.toggleItem);

  return (
    <button
      type="button"
      aria-label={isComparing ? `Remove ${item.name} from comparison` : `Add ${item.name} to comparison`}
      aria-pressed={isComparing}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem(item);
      }}
      className={`flex items-center justify-center transition-all duration-300 ease-silk active:scale-95 ${
        isComparing ? "text-rose-gold" : "text-ink"
      } ${className}`}
    >
      <GitCompare size={size} className={isComparing ? "fill-rose-gold/15" : ""} />
    </button>
  );
}
