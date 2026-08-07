"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import ProductImage from "./ProductImage";
import type { ProductCardData } from "./ProductCard";

/**
 * Quick View — product detail without leaving the grid.
 *
 * The point is preserving scroll position: on a long shop page, tapping through
 * to a product and coming back used to lose your place, which is the single most
 * annoying thing about browsing a catalogue on a phone. So this deliberately
 * shows only what a buying decision needs (price, stock, add to cart) and links
 * out for the rest, rather than trying to reproduce the product page.
 *
 * Renders as a bottom sheet on phones and a centred dialog from `sm` up, because
 * a centred box on a small screen leaves the primary action under the thumb's
 * reach and forces a stretch to the close button.
 */
export default function QuickViewModal({
  product,
  open,
  onClose,
}: {
  product: ProductCardData;
  open: boolean;
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [adding, setAdding] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const images = parseJsonArray(product.images);
  const finalPrice = discountedPrice(product.price, product.discountPercent);
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const onSale = product.discountPercent > 0;

  // Escape to dismiss, and lock the page behind the sheet so a scroll gesture
  // over the backdrop doesn't move the grid underneath.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Scroll lock, applied to <html> rather than <body>.
    //
    // The obvious alternatives both lose the reader's place, which defeats the
    // entire purpose of Quick View. `overflow: hidden` on <body> collapses the
    // scrollport and the browser clamps scrollY. Pinning the body with
    // `position: fixed` is worse: the document height collapsed from 6012px to
    // 664px, so restoring the scroll on close was clamped to 0 before layout
    // caught up — a 900px position came back as 207px.
    //
    // Setting overflow on the documentElement stops the scroll without taking
    // the body out of flow, so the height and scroll offset both survive and
    // nothing needs restoring afterwards.
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    // Focus moves into the dialog, so on close the browser would otherwise scroll
    // whatever it lands on back into view. Return it to the trigger explicitly,
    // with preventScroll so that restoration cannot move the page either.
    const trigger = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so keyboard and screen-reader users land here
    // rather than continuing from the card behind it.
    // preventScroll is required, not cosmetic. A bare focus() asks the browser to
    // scroll the target into view, and doing that while the page is scroll-locked
    // moved the grid from 900px to 198px — so closing the sheet returned the
    // reader to the top of the catalogue, which is precisely what Quick View is
    // meant to avoid. The dialog is already viewport-anchored; it needs no
    // scrolling into view.
    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previousHtmlOverflow;
      window.clearTimeout(focusTimer);
      trigger?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  // Keep Tab inside the dialog while it is open.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

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
    onClose();
    openCart();
    window.setTimeout(() => setAdding(false), 400);
  }

  return (
    <div
      // z-65 is deliberate: above the search overlay and mobile filter drawer
      // (both z-60), but below the cart drawer (z-70/71). Adding to cart closes
      // this and opens that, and the drawer must land on top during the handover.
      className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-label="Close quick view"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/45 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-e4 sm:rounded-2xl
                   animate-[slideUp_260ms_cubic-bezier(0.22,1,0.36,1)] sm:animate-[fadeIn_200ms_ease-out]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink/70 shadow-e2 backdrop-blur transition-colors hover:text-ink"
        >
          <X size={17} />
        </button>

        <div className="flex flex-col sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 bg-beige sm:aspect-square sm:w-44">
            <ProductImage
              src={images[0] || ""}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className={`object-cover ${outOfStock ? "grayscale opacity-60" : ""}`}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
              {product.brand.name}
            </p>
            <h2 className="mt-1 font-display text-lg leading-snug text-ink">{product.name}</h2>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-ink">{formatBDT(finalPrice)}</span>
              {onSale && (
                <>
                  <span className="text-sm text-ink/40 line-through">{formatBDT(product.price)}</span>
                  <span className="rounded-full bg-badge-sale-text/10 px-2 py-0.5 text-[11px] font-bold text-badge-sale-text">
                    -{product.discountPercent}%
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-xs text-ink/60">
              {outOfStock ? (
                <span className="font-semibold text-ink/70">Out of stock</span>
              ) : lowStock ? (
                <span className="font-semibold text-badge-today-text">Only {product.stock} left</span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={12} className="shrink-0 text-badge-new-text" />
                  In stock &middot; 100% authentic
                </span>
              )}
            </p>

            <div className="mt-auto pt-5">
              <button
                type="button"
                onClick={handleAdd}
                disabled={outOfStock || adding}
                // Matches the product page and the card: one look for one action.
                className="btn-cart w-full"
              >
                {adding && <Loader2 size={15} className="animate-spin" />}
                {outOfStock ? "Out of stock" : adding ? "Adding…" : "Add to Cart"}
              </button>

              <Link
                href={`/product/${product.slug}`}
                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-gold-text hover:underline"
              >
                View full details
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
