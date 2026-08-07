import { Dictionary } from "@/lib/i18n/dictionaries";
import ProductRail from "./ProductRail";
import { ProductCardData } from "./ProductCard";

/**
 * Trending was the odd one out on the homepage: a horizontally-scrolling shelf
 * of fixed 224px cards with a plain text "View all" link, while every
 * neighbouring band was a responsive grid under a centred header. Two costs
 * came with that — the narrow card clipped its own quick-view label on a phone,
 * and half the row sat off-screen with only a scrollbar to say so.
 *
 * It is the shared rail now, and keeps its own name only because the homepage
 * builder and the admin preview address the section by this component.
 */
export default function TrendingShelf({
  dict,
  products,
  title,
  subtitle,
  showViewAll = true,
  viewAllText,
  viewAllUrl,
  backgroundColor,
}: {
  dict: Dictionary;
  products: ProductCardData[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllText?: string;
  viewAllUrl?: string;
  backgroundColor?: string;
}) {
  return (
    <ProductRail
      title={title || dict.home.trending}
      eyebrow="Most Loved This Week"
      subtitle={subtitle}
      description="What Bangladesh is reaching for right now, ranked by what actually leaves the shelf."
      href={viewAllUrl || "/shop?filter=trending"}
      products={products}
      showViewAll={showViewAll}
      viewAllText={viewAllText || dict.home.viewAll}
      backgroundColor={backgroundColor}
    />
  );
}
