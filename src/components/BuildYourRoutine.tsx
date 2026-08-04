"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/lib/cart-store";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";

export interface RoutineStepProduct {
  id: string;
  name: string;
  slug: string;
  images: string;
  price: number;
  discountPercent: number;
  stock: number;
  brand: { name: string };
}

export interface RoutineStep {
  slug: string;
  label: string;
  product: RoutineStepProduct;
  /** True when this step's recommendation IS the product page the customer is
   * currently viewing — highlighted rather than re-explained. */
  isCurrentProduct: boolean;
}

export default function BuildYourRoutine({ steps, currentProductId }: { steps: RoutineStep[]; currentProductId: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(steps.map((s) => [s.product.id, true]))
  );
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  // A routine only makes sense with more than the one product already being
  // viewed — one recommendation alongside it is the minimum for "a routine".
  if (steps.length < 2) return null;

  const selectedSteps = steps.filter((s) => checked[s.product.id]);
  const total = selectedSteps.reduce((sum, s) => sum + discountedPrice(s.product.price, s.product.discountPercent), 0);

  function addRoutineToCart() {
    selectedSteps.forEach((s) => {
      const images = parseJsonArray(s.product.images);
      addItem({
        productId: s.product.id,
        name: s.product.name,
        slug: s.product.slug,
        image: images[0] || "",
        price: discountedPrice(s.product.price, s.product.discountPercent),
        quantity: 1,
        stock: s.product.stock,
      });
    });
    toast.success(`Added your ${selectedSteps.length}-step routine to cart`);
    openCart();
  }

  return (
    <section className="mt-14 md:mt-20">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-3">The Full Ritual</p>
        <h2 className="font-display text-2xl mb-2">Build Your Routine</h2>
        <p className="text-sm text-body max-w-md mx-auto">
          The complete Korean skincare sequence — cleanse, tone, treat, hydrate, protect. Uncheck any step you don't need.
        </p>
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((step, i) => {
          const images = parseJsonArray(step.product.images);
          const finalPrice = discountedPrice(step.product.price, step.product.discountPercent);
          const isChecked = !!checked[step.product.id];
          const outOfStock = step.product.stock === 0;
          return (
            <div key={step.slug} className="flex items-center shrink-0">
              <label
                className={`group relative flex w-36 sm:w-44 shrink-0 flex-col rounded-xl2 border p-3 cursor-pointer transition-all duration-200 ease-silk ${
                  isChecked ? "border-rose-gold/40 bg-white shadow-e2" : "border-border-soft bg-white/60 opacity-60"
                }`}
              >
                <div className="absolute top-2.5 left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/85 text-[10px] font-bold text-white z-10">
                  {i + 1}
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => setChecked((c) => ({ ...c, [step.product.id]: !c[step.product.id] }))}
                  className="absolute top-2.5 right-2.5 z-10 accent-rose-gold"
                />

                <Link href={`/product/${step.product.slug}`} className="block" onClick={(e) => e.stopPropagation()}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-beige mb-2.5">
                    {images[0] && <Image src={images[0]} alt={step.product.name} fill sizes="176px" className="object-cover" />}
                    {step.isCurrentProduct && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-rose-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        You're Viewing
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-gold-text font-semibold">{step.label}</p>
                  <p className="text-xs font-medium text-ink line-clamp-2 leading-snug mt-0.5 group-hover:text-rose-gold-text transition-colors">
                    {step.product.name}
                  </p>
                  <p className="text-xs font-semibold text-ink mt-1.5">{outOfStock ? "Out of stock" : formatBDT(finalPrice)}</p>
                </Link>
              </label>

              {i < steps.length - 1 && (
                <ChevronRight size={16} className="mx-1 sm:mx-2 shrink-0 text-ink/20" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 rounded-xl2 bg-beige/50 p-5">
        <p className="text-sm text-ink/70">
          Routine total ({selectedSteps.length} step{selectedSteps.length !== 1 ? "s" : ""}):{" "}
          <span className="font-display text-lg font-semibold text-ink">{formatBDT(total)}</span>
        </p>
        <button
          onClick={addRoutineToCart}
          disabled={selectedSteps.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          <ShoppingBag size={15} /> Add Full Routine to Cart
        </button>
      </div>
    </section>
  );
}
