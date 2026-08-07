import ProductCard, { ProductCardData } from "./ProductCard";
import FlashSaleCountdown from "./FlashSaleCountdown";
import { SectionHeading, SectionViewAll } from "./SectionHeading";

// Deliberately NOT a framer-motion scroll-reveal component: content that starts at
// opacity:0 and waits for JS to reveal it is fragile — any hiccup in hydration or
// animation timing leaves the whole section blank. Product rails render fully visible
// immediately; only small hover/tap feedback (in ProductCard) uses motion.
export default function ProductRail({
  title,
  eyebrow,
  subtitle,
  description,
  href,
  products,
  showCountdown,
  showViewAll = true,
  viewAllText,
  backgroundColor,
}: {
  title: string;
  /** Small caps line above the title. `subtitle` (the admin field) wins. */
  eyebrow?: string;
  subtitle?: string;
  description?: string;
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
      <SectionHeading eyebrow={subtitle || eyebrow} title={title} description={description}>
        {showCountdown && <FlashSaleCountdown />}
      </SectionHeading>

      {/* flex-wrap rather than a grid so a rail too short to fill one row centres
          instead of hugging the left edge — a flash sale with two products in a
          four-column grid left half the row empty and read as a layout bug. Once
          there's more than a full row it goes back to left-aligned, because a
          lone centred card at the end of a longer list looks stranded.

          Card widths reproduce a grid exactly when a row is full, at 2 / 3 / 4
          across. The old grid jumped straight from two to four at 768px, which
          squeezed a tablet card to 154px — narrow enough that product names
          wrapped to three lines. */}
      <ul
        className={`flex flex-wrap gap-x-4 gap-y-9 md:gap-x-6 md:gap-y-12 ${
          products.length < 4 ? "justify-center" : "justify-start"
        }`}
      >
        {products.map((p) => (
          <li key={p.id} className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>

      {showViewAll && <SectionViewAll href={href} label={viewAllText} />}
    </section>
  );
}
