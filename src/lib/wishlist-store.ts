"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

/**
 * Shared, optimistic wishlist state.
 *
 * Before this existed, every ProductCard kept its own `useState(false)` heart
 * that never called the API — clicking it looked like it worked, saved nothing,
 * and reset the moment you navigated. The same product could also show as
 * wishlisted in the search overlay and not on the card behind it.
 *
 * Now there is one source of truth, hydrated once per session. Toggling updates
 * the store immediately and reverts if the request fails, so the heart responds
 * on the same frame as the click rather than after a round trip.
 */
interface WishlistState {
  ids: Set<string>;
  hydrated: boolean;
  /** In-flight product ids — lets a card show a pending state and ignore double clicks. */
  pending: Set<string>;
  hydrate: () => Promise<void>;
  toggle: (productId: string, productName?: string) => Promise<void>;
  has: (productId: string) => boolean;
  isPending: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: new Set(),
  hydrated: false,
  pending: new Set(),

  hydrate: async () => {
    if (get().hydrated) return;
    // Set immediately so concurrent mounts don't each fire a request.
    set({ hydrated: true });
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      set({ ids: new Set((data.items || []).map((i: any) => i.productId)) });
    } catch {
      // Signed-out visitors get an empty list from the API; a network failure
      // just leaves the wishlist empty rather than breaking the page.
    }
  },

  toggle: async (productId, productName) => {
    const { ids, pending } = get();
    if (pending.has(productId)) return;

    const wasSaved = ids.has(productId);
    const optimistic = new Set(ids);
    wasSaved ? optimistic.delete(productId) : optimistic.add(productId);
    set({ ids: optimistic, pending: new Set(pending).add(productId) });

    try {
      const res = await fetch("/api/wishlist", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Roll back to the pre-click state — the heart must never claim
        // something was saved when it wasn't.
        const reverted = new Set(get().ids);
        wasSaved ? reverted.add(productId) : reverted.delete(productId);
        set({ ids: reverted });
        toast.error(data.error || "Please sign in to save items to your wishlist");
        return;
      }

      toast.success(
        wasSaved
          ? `${productName || "Item"} removed from wishlist`
          : `${productName || "Item"} saved to wishlist`
      );
    } catch {
      const reverted = new Set(get().ids);
      wasSaved ? reverted.add(productId) : reverted.delete(productId);
      set({ ids: reverted });
      toast.error("Something went wrong. Please try again.");
    } finally {
      const next = new Set(get().pending);
      next.delete(productId);
      set({ pending: next });
    }
  },

  has: (productId) => get().ids.has(productId),
  isPending: (productId) => get().pending.has(productId),
}));
