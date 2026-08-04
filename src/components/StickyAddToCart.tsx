"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { formatBDT } from "@/lib/utils";

interface Props {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  stock: number;
}

/**
 * Appears once the main AddToCartPanel (marked with #main-add-to-cart in the page)
 * scrolls out of view, and hides again once it's back on screen — so the CTA is
 * always reachable without permanently shrinking the viewport. Reuses the exact
 * same cart store the main panel uses; this is a second UI entry point, not a
 * second cart implementation.
 */
export default function StickyAddToCart({ productId, name, slug, image, price, stock }: Props) {
  const [visible, setVisible] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { dict } = useLocale();

  useEffect(() => {
    const target = document.getElementById("main-add-to-cart");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function handleAdd() {
    addItem({ productId, name, slug, image, price, quantity: 1, stock });
    openCart();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-soft shadow-glass safe-bottom"
        >
          <div className="container-px mx-auto py-3 flex items-center gap-4">
            <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-beige shrink-0 hidden sm:block">
              {image && <Image src={image} alt={name} fill sizes="44px" className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink line-clamp-1">{name}</p>
              <p className="text-sm font-semibold text-rose-gold-text">{formatBDT(price)}</p>
            </div>
            {stock === 0 ? (
              <span className="text-xs text-red-500 font-medium shrink-0">{dict.product.outOfStock}</span>
            ) : (
              <button onClick={handleAdd} className="btn-primary !h-10 !px-6 !text-xs shrink-0">
                {dict.product.addToCart}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
