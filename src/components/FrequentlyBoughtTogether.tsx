"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import toast from "react-hot-toast";

export interface FbtProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number;
  images: string;
  stock: number;
}

export default function FrequentlyBoughtTogether({ items }: { items: FbtProduct[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, true]))
  );
  const addItem = useCartStore((s) => s.addItem);

  if (items.length < 2) return null;

  const selected = items.filter((i) => checked[i.id]);
  const total = selected.reduce((sum, i) => sum + discountedPrice(i.price, i.discountPercent), 0);

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function addAllToCart() {
    selected.forEach((item) => {
      const images = parseJsonArray(item.images);
      addItem({
        productId: item.id,
        name: item.name,
        slug: item.slug,
        image: images[0] || "",
        price: discountedPrice(item.price, item.discountPercent),
        quantity: 1,
        stock: item.stock,
      });
    });
    toast.success(`Added ${selected.length} items to cart`);
  }

  return (
    <section className="mt-16 bg-beige/40 rounded-xl2 p-6">
      <h2 className="font-display text-2xl mb-6">Frequently Bought Together</h2>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {items.map((item, i) => {
          const images = parseJsonArray(item.images);
          const finalPrice = discountedPrice(item.price, item.discountPercent);
          return (
            <div key={item.id} className="flex items-center gap-3">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="relative">
                  <div className={`relative h-20 w-20 rounded-lg overflow-hidden ring-2 transition-all ${checked[item.id] ? "ring-rose-gold" : "ring-transparent opacity-50"}`}>
                    {images[0] && <Image src={images[0]} alt={item.name} fill sizes="80px" className="object-cover" />}
                  </div>
                  <span className={`absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white ${checked[item.id] ? "bg-rose-gold" : "bg-ink/20"}`}>
                    <Check size={12} />
                  </span>
                  <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)} className="sr-only" />
                </div>
                <Link href={`/product/${item.slug}`} className="text-xs text-center max-w-[90px] line-clamp-2 hover:text-rose-gold-text">{item.name}</Link>
                <span className="text-xs font-semibold">{formatBDT(finalPrice)}</span>
              </label>
              {i < items.length - 1 && <Plus size={16} className="text-ink/30" />}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-4">
        <p className="text-sm">
          Total for {selected.length} item{selected.length !== 1 ? "s" : ""}: <span className="font-bold text-lg text-rose-gold-text">{formatBDT(total)}</span>
        </p>
        <button onClick={addAllToCart} disabled={selected.length === 0} className="btn-primary disabled:opacity-40">
          Add Selected to Cart
        </button>
      </div>
    </section>
  );
}
