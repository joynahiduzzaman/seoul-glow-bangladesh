"use client";

import Link from "next/link";
import { Eye, ShieldCheck, Loader2, CalendarClock } from "lucide-react";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { BadgeStamp, BadgePill } from "./Badge";
import CompareButton from "./CompareButton";
import WishlistButton from "./WishlistButton";
import ProductImage from "./ProductImage";
import QuickViewModal from "./QuickViewModal";
import { useState } from "react";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number;
  images: string;
  stock: number;
  brand: { name: string; slug: string };
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFlashSale?: boolean;
  isTrending?: boolean;
  /** Optional — Prisma hands this over as a Date, JSON transport as a string. */
  expiryDate?: Date | string | null;
}

/** "Exp Mar 2027" — month + year only. A day-level date implies a precision
 * that isn't useful on a browse card and makes the badge too wide to sit
 * beside SALE on a narrow phone column. */
function formatExpiry(value: Date | string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `Exp ${d.toLocaleDateString("en-BD", { month: "short", year: "numeric" })}`;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const images = parseJsonArray(product.images);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { dict } = useLocale();
  const [adding, setAdding] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const finalPrice = discountedPrice(product.price, product.discountPercent);
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const onSale = product.discountPercent > 0;
  // Shown on every product that has a date on file, not only discounted ones —
  // shelf life is trust information for skincare, so it shouldn't appear and
  // disappear depending on whether something happens to be on offer.
  const expiryLabel = product.expiryDate ? formatExpiry(product.expiryDate) : null;

  // The cart itself is local (zustand), so adding is already instant. The brief
  // pending state exists purely so the click has a visible acknowledgement
  // before the drawer slides in — without it the button feels unresponsive on
  // slower devices where the drawer animation starts a frame or two later.
  function handleAdd() {
    setAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: images[0] || "",
      price: finalPrice,
      quantity: 1,
      stock: product.stock,
    });
    openCart();
    window.setTimeout(() => setAdding(false), 400);
  }

  return (
    // h-full + flex column: the grid stretches every card to the tallest in its
    // row, and this makes the card actually fill that height so the button can
    // sit on a shared baseline instead of floating under short content.
    <article className="group relative flex h-full flex-col">
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 bg-white ring-1 ring-ink/5 p-3 shadow-e1 transition-all duration-500 ease-silk group-hover:shadow-e4 group-hover:ring-ink/10">
          {/* Every overlay lives inside this inner frame so they all share one
              coordinate space — previously the hover pill was positioned against
              the inner image while the action icons were positioned against the
              outer padded box, which is how they ended up colliding. */}
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-beige">
            {images[0] && (
              <ProductImage
                src={images[0]}
                alt={product.name}
                fill
                // Sold out used to stack full greyscale, 60% opacity AND a
                // cream veil with a blur on top — three dimming effects on one
                // photo, which left the product barely identifiable. A shopper
                // who can't tell what it is can't decide to come back for it.
                // A light desaturation is enough to read as unavailable in a
                // grid; the badge and the disabled button carry the message.
                className={`object-cover group-hover:scale-[1.07] ${outOfStock ? "grayscale-[0.35]" : ""}`}
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            )}

            {/* The badge carries the message rather than a veil over the whole
                photo. Its own near-opaque pill is what makes it legible, on a
                pale product shot as easily as a dark one, so nothing needs to
                be laid over the product itself. */}
            {outOfStock && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-ink/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cream shadow-e2">
                  Sold Out
                </span>
              </div>
            )}

            {/* Single bottom action bar: Quick View, Compare and Wishlist all
                share one horizontal line and one baseline.
                The pill takes the remaining width (flex-1) with its label
                centred inside, so it can never reach under the icons no matter
                how narrow the card gets — which is what made the two collide
                when they were positioned independently.
                It also keeps occupying that space while hidden, so the icons
                don't shift sideways when the fade runs: opacity only, no
                layout change. */}
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
              {!outOfStock && (
                // Sits inside the <Link> that wraps the card, so it has to cancel
                // the navigation itself — otherwise opening the sheet and routing
                // to the product page race each other.
                //
                // Visibility differs by input, not by screen size: touch devices
                // have no hover, so gating on it there left the control
                // permanently unreachable. Always visible below `md`, revealed on
                // hover above it where the affordance is the point.
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickViewOpen(true);
                  }}
                  aria-label={`Quick view: ${product.name}`}
                  className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/90 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink opacity-100 shadow-e2 backdrop-blur transition-opacity duration-300 ease-silk md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                >
                  <Eye size={13} className="shrink-0" />
                  <span className="truncate">Quick View</span>
                </button>
              )}

              {/* ml-auto matters for the states where no pill is rendered — out
                  of stock, and every width below `md` — so the icons still sit
                  in the bottom-right corner rather than drifting left. */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <CompareButton
                  item={{ productId: product.id, name: product.name, slug: product.slug, image: images[0] || "", price: finalPrice, brandName: product.brand.name }}
                  className="h-9 w-9 rounded-full glass shadow-e1 transition-transform duration-300 ease-silk hover:scale-110"
                />
                <WishlistButton
                  productId={product.id}
                  productName={product.name}
                  className="h-9 w-9 rounded-full glass shadow-e1 transition-transform duration-300 ease-silk hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Stamp badge, top-left — only one, priority: best seller > flash sale > new */}
          <div className="absolute top-4 left-4">
            {product.isBestSeller ? (
              <BadgeStamp variant="best" />
            ) : product.isFlashSale ? (
              <BadgeStamp variant="today" />
            ) : product.isNewArrival ? (
              <BadgeStamp variant="new" />
            ) : null}
          </div>

          {onSale && (
            <span className="absolute top-4 right-4 rounded-full bg-badge-sale px-2.5 py-1 text-[11px] font-extrabold text-white shadow-e1">
              -{product.discountPercent}%
            </span>
          )}
        </div>

        {/* ── Content bands ────────────────────────────────────────────────
            Every band below is a FIXED height. That is what actually keeps
            names, badges, prices and buttons on a shared line across a row:
            growing the card alone isn't enough, because a one-line title would
            still push everything under it upward relative to a two-line title.
            Heights are sized to the tallest state each band can reach. */}
        <div className="mt-4 flex flex-1 flex-col">
          <p className="flex h-4 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-olive">
            <span className="truncate">{product.brand.name}</span>
            <ShieldCheck size={12} className="shrink-0 text-success" aria-label="100% Authentic" />
          </p>

          {/* h-11 = exactly two lines of 16px/leading-snug type. Reserved whether
              the title wraps to one line or two, so the price never shifts. */}
          <h3 className="mt-1.5 line-clamp-2 h-11 font-display text-base leading-snug text-ink transition-colors duration-200 group-hover:text-rose-gold-text">
            {product.name}
          </h3>

          {/* Merchandising row — fixed height and single-line. nowrap + overflow
              hidden means a product carrying several tags degrades by clipping
              the least important one rather than wrapping and knocking the card
              taller than its neighbours. */}
          <div className="mt-1.5 flex h-[22px] items-center gap-1.5 overflow-hidden">
            {/* Expiry leads the row deliberately. The row is single-line with
                overflow clipped, so whatever sits last is what disappears on a
                narrow card — and this is the one item that must always survive.
                The promotional pills after it are decorative repeats of signals
                already on the image (the -% chip) or in the price. */}
            {expiryLabel && (
              <span
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-ink/10 bg-beige/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink/70"
                title={`Best before ${expiryLabel.replace(/^Exp /, "")}`}
              >
                <CalendarClock size={10} className="shrink-0" aria-hidden="true" />
                {expiryLabel}
              </span>
            )}
            {onSale && <BadgePill variant="sale" />}
            {product.isFlashSale && <BadgePill variant="today" />}
            {product.isTrending && <BadgePill variant="coupon">COUPON</BadgePill>}
          </div>

          {/* Below 390px the two-column grid leaves a 128px card, and price plus
              struck-through price need 163px side by side — the overflow pushed
              the whole document 15px wide, so every page scrolled sideways. No
              type scale closes a 35px gap, so they stack instead. The reserved
              height is fixed at each breakpoint rather than auto, which is what
              keeps this row from shifting as prices load. */}
          <div className="mt-1.5 flex h-7 items-baseline gap-2 max-[389px]:h-11 max-[389px]:flex-col max-[389px]:items-start max-[389px]:gap-0">
            <span className="text-lg font-semibold tabular-nums text-ink">{formatBDT(finalPrice)}</span>
            {onSale && (
              <span className="text-xs tabular-nums text-ink/70 line-through">{formatBDT(product.price)}</span>
            )}
          </div>

          {/* Reserved whether or not the product is low on stock — otherwise the
              button under a low-stock card sits lower than its neighbours.
              Honest scarcity only: driven by real stock, never a fake countdown. */}
          <p className="h-4 text-[11px] font-medium text-badge-sale">
            {lowStock ? `Only ${product.stock} left` : ""}
          </p>
        </div>
      </Link>

      {/* mt-auto keeps this on the card's bottom edge even if a row is stretched
          taller than the fixed bands above account for. */}
      <button
        onClick={handleAdd}
        disabled={outOfStock || adding}
        // Same rose fill as the product page's button so the action looks the
        // same wherever it appears; shorter and without the lift, because a grid
        // of cards each rising on hover is noise rather than emphasis.
        className="btn-cart mt-3 w-full !h-11 !gap-2 !px-3 !text-xs !font-semibold uppercase !tracking-[0.1em] hover:!translate-y-0"
      >
        {adding && <Loader2 size={13} className="animate-spin" />}
        {outOfStock ? dict.product.outOfStock.split(".")[0] : dict.product.addToCart}
      </button>

      {/* Mounted only while open — a grid of 20 cards should not carry 20 idle
          dialogs, each with its own escape-key and scroll-lock effects. */}
      {quickViewOpen && (
        <QuickViewModal product={product} open onClose={() => setQuickViewOpen(false)} />
      )}
    </article>
  );
}
