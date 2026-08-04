"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/wishlist-store";

/**
 * The heart, everywhere. Reads shared optimistic state so the same product
 * always shows the same status on a card, in search results and on its own page.
 *
 * The fill pops on toggle rather than fading — a small, immediate physical
 * response reads as "done" far better than a slow colour transition.
 */
export default function WishlistButton({
  productId,
  productName,
  className = "",
  size = 16,
}: {
  productId: string;
  productName?: string;
  className?: string;
  size?: number;
}) {
  const saved = useWishlistStore((s) => s.ids.has(productId));
  const pending = useWishlistStore((s) => s.pending.has(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  const hydrate = useWishlistStore((s) => s.hydrate);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${productName || "item"} from wishlist` : `Save ${productName || "item"} to wishlist`}
      aria-pressed={saved}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPopping(true);
        window.setTimeout(() => setPopping(false), 320);
        toggle(productId, productName);
      }}
      className={`flex items-center justify-center transition-all duration-300 ease-silk active:scale-90 disabled:cursor-wait ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-300 ease-silk ${popping ? "scale-125" : "scale-100"} ${
          saved ? "fill-badge-sale text-badge-sale" : "text-ink"
        }`}
      />
    </button>
  );
}
