"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { useCompareStore } from "@/lib/compare-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { useRouter } from "next/navigation";
import { Minus, Plus, GitCompare, ShoppingBag, Check, Loader2 } from "lucide-react";

interface Props {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  stock: number;
  brandName?: string;
}

type Status = "idle" | "adding" | "added";

export default function AddToCartPanel({ productId, name, slug, image, price, stock, brandName = "" }: Props) {
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const isComparing = useCompareStore((s) => s.isComparing(productId));
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const router = useRouter();
  const { dict } = useLocale();

  // Nothing may fire after unmount — leaving the page mid-confirmation would
  // otherwise set state on a component that is gone.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function handleAdd() {
    if (status !== "idle") return;
    // The cart is local state, so this resolves immediately; the pending frame
    // exists so the button is never a dead click on a slow device, and the
    // "Added" confirmation is what the shopper actually reads.
    setStatus("adding");
    addItem({ productId, name, slug, image, price, quantity: qty, stock });
    timers.current.push(
      setTimeout(() => {
        setStatus("added");
        openCart();
        timers.current.push(setTimeout(() => setStatus("idle"), 1800));
      }, 180)
    );
  }

  function handleBuyNow() {
    addItem({ productId, name, slug, image, price, quantity: qty, stock });
    router.push("/checkout");
  }

  if (stock === 0) {
    return (
      <div className="space-y-3">
        <button type="button" disabled className="btn-cart w-full sm:w-auto sm:min-w-[15rem]">
          <ShoppingBag size={17} aria-hidden="true" />
          {dict.product.outOfStock}
        </button>
        <p className="text-sm font-medium text-red-600">{dict.product.outOfStock}</p>
      </div>
    );
  }

  const atMin = qty <= 1;
  const atMax = qty >= stock;
  const busy = status !== "idle";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Quantity. Full width on a phone so the two steppers are wide, easy
            targets rather than a pinched pill. */}
        <div className="flex h-[52px] w-full items-center justify-between rounded-xl border border-ink/15 bg-white/70 sm:w-auto sm:justify-start">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={atMin}
            className="flex h-full w-14 items-center justify-center rounded-l-xl text-ink transition-colors hover:text-rose-gold-text disabled:cursor-not-allowed disabled:text-ink/25 sm:w-12"
            aria-label="Decrease quantity"
          >
            <Minus size={15} aria-hidden="true" />
          </button>
          <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            disabled={atMax}
            className="flex h-full w-14 items-center justify-center rounded-r-xl text-ink transition-colors hover:text-rose-gold-text disabled:cursor-not-allowed disabled:text-ink/25 sm:w-12"
            aria-label="Increase quantity"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>

        <button
          onClick={handleAdd}
          disabled={busy}
          // The label changes, so the accessible name is pinned to the action.
          aria-label={dict.product.addToCart}
          className="btn-cart w-full sm:w-auto sm:min-w-[15rem]"
        >
          {status === "adding" ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Adding…
            </>
          ) : status === "added" ? (
            <>
              <Check size={18} aria-hidden="true" />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingBag size={17} aria-hidden="true" />
              {dict.product.addToCart}
            </>
          )}
        </button>

        {/* Filled, but olive rather than rose: a real action that cannot be
            mistaken for the same one. The handler is unchanged. */}
        {/* A floor on the width so it does not collapse to a small pill beside
            the wider primary — still narrower, which is the hierarchy, but
            deliberately so rather than by accident of label length. */}
        <button onClick={handleBuyNow} className="btn-buy w-full sm:w-auto sm:min-w-[10rem]">
          {dict.product.buyNow}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-olive">
          <span className="h-1.5 w-1.5 rounded-full bg-olive" aria-hidden="true" />
          {stock} {dict.product.inStock}
        </span>
        <button
          type="button"
          aria-pressed={isComparing}
          onClick={() => toggleCompare({ productId, name, slug, image, price, brandName })}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-all duration-200 ${
            isComparing
              ? "border-rose-gold bg-rose-gold/10 text-rose-gold-text"
              : "border-ink/15 text-ink/70 hover:border-ink/30 hover:text-ink"
          }`}
        >
          <GitCompare size={13} aria-hidden="true" /> {isComparing ? "Added to Compare" : "Add to Compare"}
        </button>
      </div>
    </div>
  );
}
