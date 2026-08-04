"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { useCompareStore } from "@/lib/compare-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { useRouter } from "next/navigation";
import { Minus, Plus, GitCompare } from "lucide-react";

interface Props {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  stock: number;
  brandName?: string;
}

export default function AddToCartPanel({ productId, name, slug, image, price, stock, brandName = "" }: Props) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const isComparing = useCompareStore((s) => s.isComparing(productId));
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const router = useRouter();
  const { dict } = useLocale();

  function handleAdd() {
    addItem({ productId, name, slug, image, price, quantity: qty, stock });
    openCart();
  }

  function handleBuyNow() {
    addItem({ productId, name, slug, image, price, quantity: qty, stock });
    router.push("/checkout");
  }

  if (stock === 0) {
    return <p className="text-sm text-red-500 font-medium">{dict.product.outOfStock}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center border border-ink/15 rounded-full">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3.5 hover:text-rose-gold transition-colors" aria-label="Decrease quantity">
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-sm font-medium">{qty}</span>
        <button onClick={() => setQty((q) => Math.min(stock, q + 1))} className="p-3.5 hover:text-rose-gold transition-colors" aria-label="Increase quantity">
          <Plus size={14} />
        </button>
      </div>
      <button onClick={handleAdd} className="btn-outline !px-7">{dict.product.addToCart}</button>
      <button onClick={handleBuyNow} className="btn-primary !px-7">{dict.product.buyNow}</button>
      <button
        type="button"
        aria-pressed={isComparing}
        onClick={() => toggleCompare({ productId, name, slug, image, price, brandName })}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ${
          isComparing ? "border-rose-gold bg-rose-gold/10 text-rose-gold" : "border-ink/15 text-ink/70 hover:border-ink/30 hover:text-ink"
        }`}
      >
        <GitCompare size={13} /> {isComparing ? "Added to Compare" : "Add to Compare"}
      </button>
      <span className="text-xs text-ink/70 w-full">{stock} {dict.product.inStock}</span>
    </div>
  );
}
