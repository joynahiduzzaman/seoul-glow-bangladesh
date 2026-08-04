import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard, { ProductCardData } from "./ProductCard";
import FlashSaleCountdown from "./FlashSaleCountdown";

// Deliberately NOT a framer-motion scroll-reveal component: content that starts at
// opacity:0 and waits for JS to reveal it is fragile — any hiccup in hydration or
// animation timing leaves the whole section blank. Product rails render fully visible
// immediately; only small hover/tap feedback (in ProductCard) uses motion.
export default function ProductRail({
  title,
  subtitle,
  href,
  products,
  showCountdown,
  showViewAll = true,
  viewAllText,
  backgroundColor,
}: {
  title: string;
  subtitle?: string;
  href: string;
  products: ProductCardData[];
  showCountdown?: boolean;
  showViewAll?: boolean;
  viewAllText?: string;
  backgroundColor?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-8 md:mb-10">
        <div>
          {subtitle && <p className="eyebrow mb-2.5 text-gold">{subtitle}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="section-title">{title}</h2>
            {showCountdown && <FlashSaleCountdown />}
          </div>
        </div>
        {showViewAll && (
          <Link
            href={href}
            className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-rose-gold-text transition-colors hover:text-[#B27878]"
          >
            {(viewAllText || "View all").replace(/\s*→\s*$/, "")}
            <ArrowRight
              size={15}
              className="transition-transform duration-300 ease-silk group-hover/link:translate-x-1"
            />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-9 md:gap-x-6 md:gap-y-12">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
