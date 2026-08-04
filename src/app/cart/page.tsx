"use client";

import { useCartStore } from "@/lib/cart-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { formatBDT } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();
  const { dict } = useLocale();
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  async function applyCoupon() {
    const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal()}`);
    const data = await res.json();
    setCouponMsg(data.valid ? `Coupon applied: -${data.discount} BDT` : data.message || "Invalid coupon");
  }

  if (items.length === 0) {
    return (
      <div className="container-px mx-auto flex flex-col items-center py-20 md:py-28 text-center animate-fade-up">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-beige/70 ring-1 ring-border-soft">
          <ShoppingBag size={30} className="text-rose-gold" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-3xl font-semibold mb-2.5">{dict.cart.empty}</h1>
        <p className="text-ink/70 mb-8 max-w-sm leading-relaxed">{dict.cart.emptyDesc}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn-primary">{dict.cart.continueShopping}</Link>
          <Link href="/shop?filter=bestseller" className="btn-ghost">Browse Best Sellers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto py-6 md:py-10">
      <h1 className="font-display text-2xl md:text-3xl font-semibold mb-6 md:mb-8">{dict.cart.title}</h1>
      <div className="grid md:grid-cols-[1fr_320px] gap-6 md:gap-10">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 border-b border-border-soft pb-5">
              <Link href={`/product/${item.slug}`} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-beige shrink-0 ring-1 ring-ink/5">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 ease-silk group-hover:scale-105"
                  />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.slug}`} className="font-medium text-sm transition-colors hover:text-rose-gold-text line-clamp-2">{item.name}</Link>
                <p className="text-rose-gold-text font-semibold mt-1 tabular-nums">{formatBDT(item.price)}</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex items-center rounded-xl border border-border-soft bg-white">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="touch-target !min-h-[40px] !min-w-[40px]" aria-label="Decrease quantity"><Minus size={13} /></button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="touch-target !min-h-[40px] !min-w-[40px]" aria-label="Increase quantity"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => removeItem(item.productId)} aria-label="Remove item" className="touch-target !min-h-[40px] !min-w-[40px] text-ink/70 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="font-medium text-sm tabular-nums shrink-0">{formatBDT(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="bg-beige/50 rounded-xl2 p-6 h-fit space-y-4 md:sticky md:top-28">
          <h2 className="font-display text-xl">{dict.cart.summary}</h2>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={dict.cart.coupon}
              className="field flex-1 !py-2.5"
            />
            <button onClick={applyCoupon} className="btn-outline !h-auto !py-2.5 !px-5 !text-xs shrink-0">{dict.cart.apply}</button>
          </div>
          {couponMsg && <p className="text-xs text-rose-gold-text">{couponMsg}</p>}
          <div className="rule-fade" />
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">{dict.cart.subtotal}</span>
            <span className="font-medium tabular-nums">{formatBDT(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">{dict.cart.shipping}</span>
            <span className="text-ink/70">{dict.cart.calculatedAtCheckout}</span>
          </div>
          <Link href="/checkout" className="btn-primary w-full">{dict.cart.proceedToCheckout}</Link>
        </div>
      </div>
    </div>
  );
}
