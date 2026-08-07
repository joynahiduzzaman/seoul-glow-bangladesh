import Link from "next/link";
import Image from "next/image";
import { trimmedLogoUrl } from "@/lib/brand-logo";

export interface BrandCardItem {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  /** Representative product shot — the fallback when no logo has been uploaded. */
  image?: string | null;
  productCount?: number;
  country?: string | null;
}

/** Last resort only: a brand with neither a logo nor product imagery still needs
 *  to render as something deliberate rather than an empty box. */
function BrandMonogram({ name }: { name: string }) {
  const letters = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span className="font-display text-2xl font-semibold tracking-wide text-rose-gold/70">{letters}</span>
  );
}

/**
 * One brand, presented as a logo first.
 *
 * Once their built-in transparent margin is trimmed away, the marks on file run
 * from 1.2:1 to 6.2:1 — a stacked roundel and a long wordmark cannot share a
 * frame without one being cropped or dwarfed. So the plate is a fixed box and
 * the mark is *contained* within a generous inset: the frame does the sizing,
 * not the source file's arbitrary canvas. That is what makes a brand wall read
 * as composed rather than pasted together.
 *
 * The plate is white, not cream: the marks are transparent PNGs of mostly dark
 * artwork, and white is the surface a brand's own guidelines assume. It also
 * separates the mark from the cream page so each logo sits on its own card.
 */
export default function BrandCard({ brand, priority }: { brand: BrandCardItem; priority?: boolean }) {
  const count = brand.productCount;

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e1 transition-all duration-500 ease-silk hover:-translate-y-1 hover:border-rose-gold/30 hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2"
    >
      {/* Logo plate. aspect-[5/3] is wide enough that a 1.91:1 wordmark still has
          room to breathe, and short enough that a square roundel does not float
          in a tall empty box. */}
      <div className="relative aspect-[5/3] w-full bg-white">
        <div className="absolute inset-0 flex items-center justify-center">
          {brand.logo ? (
            <Image
              src={trimmedLogoUrl(brand.logo)}
              alt={`${brand.name} logo`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
              priority={priority}
              // The inset must live on the image, not the wrapper: `fill` is
              // absolutely positioned, and an absolutely positioned box resolves
              // against its ancestor's PADDING box — so padding on the wrapper is
              // ignored entirely and the trimmed marks ran to the card edge.
              // object-fit honours this element's own content box.
              className="object-contain p-6 transition-transform duration-500 ease-silk group-hover:scale-[1.06] sm:p-8"
            />
          ) : brand.image ? (
            <Image
              src={brand.image}
              alt={`${brand.name} skincare`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
              className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.08]"
            />
          ) : (
            <BrandMonogram name={brand.name} />
          )}
        </div>
      </div>

      {/* Label plate, tinted so the white logo area above reads as its own
          surface and the card gains a base to sit on. */}
      <div className="flex flex-1 flex-col items-center gap-1 border-t border-border-soft bg-beige/40 px-3 py-3.5 text-center transition-colors duration-500 group-hover:bg-beige/70">
        <span className="line-clamp-1 font-display text-[15px] leading-snug text-ink transition-colors duration-300 group-hover:text-rose-gold-text">
          {brand.name}
        </span>
        {typeof count === "number" && (
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/50">
            {count} {count === 1 ? "product" : "products"}
          </span>
        )}
      </div>
    </Link>
  );
}
