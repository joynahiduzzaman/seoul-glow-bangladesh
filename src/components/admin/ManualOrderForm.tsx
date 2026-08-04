"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Trash2, Plus, Minus, Loader2, Tag } from "lucide-react";
import { formatBDT, shippingFeeFor, discountedPrice, parseJsonArray } from "@/lib/utils";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payment";
import CustomerPicker, { AddressPrefill, ResolvedCustomer } from "./CustomerPicker";
import ProductSearchPicker, { SearchableProduct } from "./ProductSearchPicker";

interface LineItem {
  productId: string;
  name: string;
  image?: string;
  price: number;
  stock: number;
  quantity: number;
}

const SOURCES = [
  { value: "PHONE", label: "Phone order" },
  { value: "MESSENGER", label: "Facebook Messenger" },
  { value: "WALK_IN", label: "Walk-in customer" },
];
const PAYMENT_STATUS_OPTIONS = ["PENDING", "PAID", "PARTIAL", "REFUNDED", "FAILED"];

export default function ManualOrderForm() {
  const router = useRouter();

  const [customer, setCustomer] = useState<ResolvedCustomer | null>(null);
  const [shipping, setShipping] = useState({ name: "", phone: "", district: "", area: "", street: "", insideDhaka: true, label: "Home" });
  const [guestEmail, setGuestEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [source, setSource] = useState("PHONE");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount?: number; message?: string } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [shippingOverrideEnabled, setShippingOverrideEnabled] = useState(false);
  const [shippingOverride, setShippingOverride] = useState(0);
  const [giftNote, setGiftNote] = useState("");
  const [submitting, setSubmitting] = useState<"draft" | "confirm" | null>(null);

  function addProduct(p: SearchableProduct) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, image: parseJsonArray(p.images)[0], price: discountedPrice(p.price, p.discountPercent), stock: p.stock, quantity: 1 }];
    });
  }
  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }
  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingFee = shippingOverrideEnabled ? shippingOverride : shippingFeeFor(shipping.insideDhaka);
  const discount = Math.min((couponResult?.valid ? couponResult.discount || 0 : 0) + (manualDiscount || 0), subtotal + shippingFee);
  const total = Math.max(0, subtotal - discount + shippingFee);

  async function checkCoupon() {
    if (!couponCode.trim()) {
      setCouponResult(null);
      return;
    }
    setCheckingCoupon(true);
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode.trim())}&subtotal=${subtotal}`);
      const data = await res.json();
      setCouponResult(data);
      if (!data.valid) toast.error(data.message || "Invalid coupon");
    } finally {
      setCheckingCoupon(false);
    }
  }

  function validate(): string | null {
    if (items.length === 0) return "Add at least one product";
    if (!customer && !shipping.name.trim()) return "Enter a customer name (or select/create a customer)";
    if (!shipping.phone.trim() || !shipping.district.trim() || !shipping.area.trim() || !shipping.street.trim()) {
      return "Complete the shipping address";
    }
    return null;
  }

  async function handleSubmit(saveAsDraft: boolean) {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(saveAsDraft ? "draft" : "confirm");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          userId: customer?.userId,
          shipping,
          guestEmail: customer ? undefined : guestEmail || undefined,
          giftNote: giftNote || undefined,
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
          manualDiscount: manualDiscount || undefined,
          shippingFeeOverride: shippingOverrideEnabled ? shippingOverride : undefined,
          paymentMethod,
          paymentStatus,
          source,
          saveAsDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(saveAsDraft ? "Draft order saved" : "Order created");
      router.push(`/admin/orders?highlight=${data.order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-5">
        {/* Customer */}
        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Customer</h3>
          <CustomerPicker
            onResolved={setCustomer}
            onPrefill={(p: AddressPrefill) => {
              setShipping({ name: p.name, phone: p.phone, district: p.district, area: p.area, street: p.street, insideDhaka: p.insideDhaka, label: p.label });
            }}
          />
        </section>

        {/* Shipping */}
        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Shipping Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={shipping.name} onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))} placeholder="Recipient name" className="rounded-lg border border-ink/10 px-3 py-2.5 text-sm" />
            <input value={shipping.phone} onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="rounded-lg border border-ink/10 px-3 py-2.5 text-sm" />
            <input value={shipping.district} onChange={(e) => setShipping((s) => ({ ...s, district: e.target.value }))} placeholder="District" className="rounded-lg border border-ink/10 px-3 py-2.5 text-sm" />
            <input value={shipping.area} onChange={(e) => setShipping((s) => ({ ...s, area: e.target.value }))} placeholder="Area" className="rounded-lg border border-ink/10 px-3 py-2.5 text-sm" />
            <input value={shipping.street} onChange={(e) => setShipping((s) => ({ ...s, street: e.target.value }))} placeholder="Street / house / road" className="col-span-2 rounded-lg border border-ink/10 px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={shipping.insideDhaka} onChange={(e) => setShipping((s) => ({ ...s, insideDhaka: e.target.checked }))} />
              Inside Dhaka
            </label>
            {!customer && (
              <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Guest email (optional)" type="email" className="rounded-lg border border-ink/10 px-3 py-2 text-xs w-56" />
            )}
          </div>
        </section>

        {/* Products */}
        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Products</h3>
          <ProductSearchPicker onSelect={addProduct} />
          {items.length > 0 && (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-beige shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[11px] text-ink/70">{formatBDT(item.price)} · {item.stock} in stock</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="h-7 w-7 rounded-full border border-ink/10 flex items-center justify-center hover:bg-beige/60">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="h-7 w-7 rounded-full border border-ink/10 flex items-center justify-center hover:bg-beige/60">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-medium w-20 text-right shrink-0">{formatBDT(item.price * item.quantity)}</span>
                  <button type="button" onClick={() => removeItem(item.productId)} aria-label={`Remove ${item.name}`} className="text-ink/30 hover:text-red-500 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {items.length === 0 && <p className="text-xs text-ink/35 mt-3">No products added yet.</p>}
        </section>

        {/* Discount */}
        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Discount</h3>
          <div className="flex gap-2 mb-3">
            <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }} placeholder="Coupon code" className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm" />
            <button type="button" onClick={checkCoupon} disabled={checkingCoupon} className="text-xs rounded-lg border border-ink/10 px-3 py-2 hover:border-rose-gold hover:text-rose-gold-text disabled:opacity-50">
              {checkingCoupon ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
            </button>
          </div>
          {couponResult?.valid && (
            <p className="text-xs text-success mb-3 flex items-center gap-1"><Tag size={12} /> {couponCode.toUpperCase()} applied — {formatBDT(couponResult.discount || 0)} off</p>
          )}
          <div>
            <label className="block text-[11px] text-ink/70 mb-1.5">Manual discount (BDT, on top of any coupon)</label>
            <input type="number" min={0} value={manualDiscount || ""} onChange={(e) => setManualDiscount(Number(e.target.value) || 0)} placeholder="0" className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm" />
          </div>
        </section>

        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Gift Note (optional)</h3>
          <textarea value={giftNote} onChange={(e) => setGiftNote(e.target.value)} rows={2} className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm resize-none" />
        </section>
      </div>

      {/* Sidebar: source, payment, shipping charge, summary, actions */}
      <div className="space-y-5 lg:sticky lg:top-6">
        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Order Source</h3>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm">
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </section>

        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-ink/70 mb-1.5">Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-ink/70 mb-1.5">Status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm">
                {PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Shipping Charge</h3>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={shippingOverrideEnabled} onChange={(e) => { setShippingOverrideEnabled(e.target.checked); setShippingOverride(shippingFeeFor(shipping.insideDhaka)); }} />
            Override auto-calculated fee
          </label>
          {shippingOverrideEnabled ? (
            <input type="number" min={0} value={shippingOverride} onChange={(e) => setShippingOverride(Number(e.target.value) || 0)} className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm" />
          ) : (
            <p className="text-xs text-ink/70">Auto: {formatBDT(shippingFeeFor(shipping.insideDhaka))} ({shipping.insideDhaka ? "inside" : "outside"} Dhaka)</p>
          )}
        </section>

        <section className="bg-white rounded-xl2 shadow-soft p-5">
          <h3 className="text-sm font-semibold mb-3">Summary</h3>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{formatBDT(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-rose-gold"><span>Discount</span><span>-{formatBDT(discount)}</span></div>}
            <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{formatBDT(shippingFee)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border-soft"><span>Total</span><span>{formatBDT(total)}</span></div>
          </div>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting !== null}
              className="w-full btn-primary disabled:opacity-50"
            >
              {submitting === "confirm" ? "Creating…" : "Create Order"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting !== null}
              className="w-full rounded-xl border border-ink/10 py-2.5 text-sm font-medium hover:bg-beige/60 disabled:opacity-50"
            >
              {submitting === "draft" ? "Saving…" : "Save as Draft"}
            </button>
            <p className="text-[11px] text-ink/35 text-center">Draft orders don't reserve stock or notify the customer until confirmed.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
