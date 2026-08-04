"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";

// Only enough to render the floating compare bar without a fetch — the actual
// /compare page loads full detail (ingredients, skin type, texture, etc.) from
// the API by id, so this never goes stale and never needs to store much.
export interface CompareItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  brandName: string;
}

export const MAX_COMPARE_ITEMS = 4;

interface CompareState {
  items: CompareItem[];
  toggleItem: (item: CompareItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isComparing: (productId: string) => boolean;
}

function sanitizeItems(items: unknown): CompareItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (i): i is CompareItem => i && typeof i === "object" && typeof (i as any).productId === "string"
  );
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (item) => {
        const items = sanitizeItems(get().items);
        const already = items.some((i) => i.productId === item.productId);
        if (already) {
          set({ items: items.filter((i) => i.productId !== item.productId) });
          return;
        }
        if (items.length >= MAX_COMPARE_ITEMS) {
          toast.error(`You can compare up to ${MAX_COMPARE_ITEMS} products at a time`);
          return;
        }
        set({ items: [...items, item] });
      },
      removeItem: (productId) => set({ items: sanitizeItems(get().items).filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [] }),
      isComparing: (productId) => sanitizeItems(get().items).some((i) => i.productId === productId),
    }),
    {
      name: "seoul-glow-compare",
      version: 1,
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        try {
          const persisted = persistedState as Partial<CompareState> | undefined;
          return { ...currentState, items: sanitizeItems(persisted?.items) };
        } catch {
          return currentState;
        }
      },
    }
  )
);
