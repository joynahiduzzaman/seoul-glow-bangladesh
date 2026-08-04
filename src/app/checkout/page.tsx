"use client";

import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { useLocale } from "@/lib/i18n/use-locale";
import { formatBDT, isValidBDPhone } from "@/lib/utils";
import { DISTRICTS, getDistrictById, getDistrictByName, getShippingFeeForDistrict, getUpazilasForDistrict, isDhakaZone } from "@/lib/shipping-zones";
import SearchableSelect from "@/components/SearchableSelect";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import CheckoutSteps from "@/components/CheckoutSteps";
import Link from "next/link";
import { ShieldCheck, Truck, ChevronLeft, LogIn, MapPin, Check, ShoppingBag, Loader2 } from "lucide-react";
import OrderProcessingOverlay from "@/components/OrderProcessingOverlay";

const PAYMENT_METHODS = [
  { id: "COD", label: "Cash on Delivery", desc: "Pay when your order arrives", comingSoon: false },
  { id: "BKASH", label: "bKash", desc: "Pay with your bKash wallet", comingSoon: true },
  { id: "NAGAD", label: "Nagad", desc: "Pay with your Nagad wallet", comingSoon: true },
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // -1 = overlay hidden; 0..3 = the step the order has genuinely reached.
  const [orderStep, setOrderStep] = useState(-1);
  const { dict } = useLocale();
  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    districtId: "",
    area: "",
    street: "",
    paymentMethod: "COD",
    giftNote: "",
  });

  // Everything shipping-related is derived from the selected district — never
  // a manual toggle. See src/lib/shipping-zones.ts: the fee comes from
  // SHIPPING_RATES keyed by the district's zone, so adding a finer-grained
  // pricing tier later never touches this page.
  const selectedDistrict = getDistrictById(form.districtId);
  const insideDhaka = isDhakaZone(form.districtId);
  const shippingFee = form.districtId ? getShippingFeeForDistrict(form.districtId) : 0;
  const districtOptions = useMemo(() => DISTRICTS.map((d) => ({ id: d.id, label: d.name, sublabel: d.division })), []);
  const upazilaOptions = useMemo(
    () => getUpazilasForDistrict(form.districtId).map((u) => ({ id: u.name, label: u.name })),
    [form.districtId]
  );
  const phoneValid = isValidBDPhone(form.phone);

  const total = subtotal() - discount + shippingFee;
  const selectedPayment = PAYMENT_METHODS.find((m) => m.id === form.paymentMethod);

  // Auth-aware checkout: neither login nor an account is required to buy (the /api/orders
  // route already accepts guestEmail/guestName/guestPhone) — this is purely about giving a
  // logged-in customer a faster experience (pre-filled details, saved addresses to pick
  // from) and giving a guest an easy, optional way to sign in without losing their cart,
  // since it lives in localStorage and survives the trip through /login and back.
  const [user, setUser] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        if (d.user) {
          // Only fill in fields the person hasn't already typed something into —
          // never clobber what they've entered.
          setForm((f) => ({
            ...f,
            name: f.name || d.user.name || "",
            phone: f.phone || d.user.phone || "",
            email: f.email || d.user.email || "",
          }));
          fetch("/api/account/addresses")
            .then((r) => r.json())
            .then((ad) => {
              const list = ad.addresses || [];
              setAddresses(list);
              const defaultAddr = list.find((a: any) => a.isDefault) || list[0];
              if (defaultAddr) applyAddress(defaultAddr, /* silent */ true);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyAddress(addr: any, silent = false) {
    setSelectedAddressId(addr.id);
    // Saved addresses store district/area as free text (predating this
    // district/upazila picker) — resolve the name back to a district id so
    // the combobox can show it selected. Falls back to empty (prompting the
    // shopper to reselect) for the rare address that doesn't match any of the
    // 64 official districts, rather than guessing.
    const matchedDistrict = getDistrictByName(addr.district);
    setForm((f) => ({
      ...f,
      name: addr.fullName,
      phone: addr.phone,
      districtId: matchedDistrict?.id || "",
      area: addr.area,
      street: addr.street,
    }));
    if (!silent) toast.success(`Using your "${addr.label}" address`);
  }

  async function applyCoupon() {
    if (!couponCode) return;
    const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal()}`);
    const data = await res.json();
    if (data.valid) {
      setDiscount(data.discount);
      toast.success(`Coupon applied: -${formatBDT(data.discount)}`);
    } else {
      setDiscount(0);
      toast.error(data.message || "Invalid coupon");
    }
  }

  function goToPayment() {
    if (!form.name.trim()) {
      toast.error("Enter your full name");
      return;
    }
    setPhoneTouched(true);
    if (!isValidBDPhone(form.phone)) {
      toast.error(dict.checkout.phoneInvalid);
      return;
    }
    if (!form.districtId) {
      toast.error("Select your district");
      return;
    }
    if (!form.area) {
      toast.error("Select your area / thana");
      return;
    }
    if (!form.street.trim()) {
      toast.error("Enter your street address");
      return;
    }
    setStep(2);
  }

  async function handlePlaceOrder() {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setLoading(true);
    // Step 0 "Verifying Order" — the local cart/address checks above have passed.
    setOrderStep(0);
    try {
      // Step 1 "Processing Payment" — the request is genuinely in flight now.
      setOrderStep(1);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, name: i.name, image: i.image, price: i.price, quantity: i.quantity })),
          couponCode: couponCode || undefined,
          paymentMethod: form.paymentMethod,
          shipping: {
            name: form.name,
            phone: form.phone,
            district: selectedDistrict?.name || "",
            area: form.area,
            street: form.street,
            insideDhaka,
          },
          guestEmail: form.email || undefined,
          giftNote: form.giftNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      // Step 2 "Generating Receipt" — the order exists server-side and its
      // invoice/confirmation is what the redirect below leads to.
      setOrderStep(2);
      if (data.warning) toast(data.warning, { duration: 6000, icon: "⚠️" });
      clear();

      // Step 3 "Order Confirmed" — only now, with a real order back.
      setOrderStep(3);
      toast.success("Order confirmed — thank you!");
      // Hold the confirmed state briefly so it's actually seen, then navigate.
      await new Promise((r) => setTimeout(r, 900));

      if (data.redirectUrl?.startsWith("http")) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(data.redirectUrl || "/");
      }
    } catch (err: any) {
      // Dismiss the overlay on failure — it must never sit on a step for an
      // order that didn't happen.
      setOrderStep(-1);
      setLoading(false);
      toast.error(err.message || "Something went wrong");
    }
    // NOTE: `loading` is deliberately not cleared on the success path — the
    // overlay stays up through the redirect so the button can't be pressed twice.
  }

  if (items.length === 0) {
    return (
      <div className="container-px mx-auto flex flex-col items-center py-20 md:py-28 text-center animate-fade-up">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-beige/70 ring-1 ring-border-soft">
          <ShoppingBag size={30} className="text-rose-gold" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-3xl font-semibold mb-2.5">Nothing to check out yet</h1>
        <p className="text-ink/70 mb-8 max-w-sm leading-relaxed">Add a few products to your cart and they&apos;ll show up here.</p>
        <Link href="/shop" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto py-6 md:py-10 max-w-5xl">
      <OrderProcessingOverlay open={orderStep >= 0} activeStep={orderStep} />

      <h1 className="font-display text-2xl md:text-3xl font-semibold mb-5 md:mb-8">{dict.checkout.title}</h1>

      <CheckoutSteps current={step} onStepClick={setStep} />

      <div className="grid md:grid-cols-[1fr_360px] gap-6 md:gap-10">
        <div>
          {step === 1 && (
            <section>
              <h2 className="font-display text-xl mb-4">{dict.checkout.shippingInfo}</h2>

              {/* Guest sign-in prompt — purely optional; guest checkout works fully without
                  this. Preserves the cart (localStorage) and returns here after login. */}
              {authChecked && !user && (
                <Link
                  href="/login?redirect=/checkout"
                  className="flex items-center justify-between gap-3 rounded-xl border border-rose-gold/25 bg-soft-pink/10 px-4 py-3 mb-5 text-sm hover:bg-soft-pink/20 transition-colors"
                >
                  <span className="flex items-center gap-2 text-ink/70">
                    <LogIn size={15} className="text-rose-gold shrink-0" /> Have an account? Log in for a faster checkout.
                  </span>
                  <span className="text-rose-gold-text font-medium shrink-0">Log in</span>
                </Link>
              )}

              {user && (
                <p className="text-xs text-ink/70 mb-4">Signed in as <span className="text-ink/70 font-medium">{user.name}</span></p>
              )}

              {/* Saved address picker — only for logged-in customers who have addresses on
                  file. Selecting one fills the fields below; they stay editable after. */}
              {addresses.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-wide text-ink/70 mb-2.5">Saved Addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => applyAddress(addr)}
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ${
                          selectedAddressId === addr.id ? "border-rose-gold bg-soft-pink/15" : "border-ink/10 hover:border-ink/20"
                        }`}
                      >
                        {selectedAddressId === addr.id ? (
                          <Check size={13} className="text-rose-gold shrink-0" />
                        ) : (
                          <MapPin size={13} className="text-ink/30 shrink-0" />
                        )}
                        <span>
                          <span className="font-medium text-ink">{addr.label}</span>
                          <span className="text-ink/70"> · {addr.area}, {addr.district}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input required placeholder={dict.checkout.fullName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field col-span-2" />

                <div>
                  <input
                    required
                    inputMode="numeric"
                    placeholder={dict.checkout.phone}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    onBlur={() => setPhoneTouched(true)}
                    className={`field ${phoneTouched && form.phone && !phoneValid ? "field-error" : ""}`}
                    aria-invalid={phoneTouched && Boolean(form.phone) && !phoneValid}
                  />
                  {phoneTouched && form.phone && !phoneValid && (
                    <p className="text-[11px] text-badge-sale mt-1.5">{dict.checkout.phoneInvalid}</p>
                  )}
                </div>

                <input
                  type="email"
                  placeholder={dict.checkout.email}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onBlur={() => {
                    if (form.email && items.length > 0) {
                      fetch("/api/cart-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: form.email,
                          name: form.name || undefined,
                          phone: form.phone || undefined,
                          items: items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
                          total,
                        }),
                      }).catch(() => {});
                    }
                  }}
                  className="field"
                />

                <SearchableSelect
                  options={districtOptions}
                  value={form.districtId || null}
                  onChange={(districtId) => setForm((f) => ({ ...f, districtId, area: "" }))}
                  placeholder={dict.checkout.districtPlaceholder}
                  searchPlaceholder={dict.checkout.districtSearchPlaceholder}
                  emptyMessage={dict.checkout.noMatches}
                  required
                />

                <SearchableSelect
                  options={upazilaOptions}
                  value={form.area || null}
                  onChange={(area) => setForm((f) => ({ ...f, area }))}
                  placeholder={dict.checkout.areaPlaceholder}
                  searchPlaceholder={dict.checkout.areaSearchPlaceholder}
                  emptyMessage={dict.checkout.noMatches}
                  disabled={!form.districtId}
                  disabledMessage={dict.checkout.areaDisabledMessage}
                  required
                />

                <textarea required placeholder={dict.checkout.street} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="field col-span-2" rows={2} />

                {form.districtId && (
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-soft-pink/10 border border-rose-gold/20 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 text-ink/70">
                      <Truck size={15} className="text-rose-gold shrink-0" />
                      {dict.checkout.courier}: <span className="font-medium text-ink">{insideDhaka ? dict.checkout.courierInsideDhaka : dict.checkout.courierOutsideDhaka}</span>
                    </span>
                    <span className="font-semibold text-ink">{formatBDT(shippingFee)}</span>
                  </div>
                )}

                <input placeholder={dict.checkout.giftNote} value={form.giftNote} onChange={(e) => setForm({ ...form, giftNote: e.target.value })} className="field col-span-2" />
              </div>
              <button type="button" onClick={goToPayment} className="btn-primary w-full mt-6">Continue to Payment</button>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="font-display text-xl mb-4">{dict.checkout.paymentMethod}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                      m.comingSoon
                        ? "cursor-not-allowed opacity-50 border-ink/10"
                        : `cursor-pointer ${form.paymentMethod === m.id ? "border-rose-gold bg-soft-pink/20" : "border-ink/10 hover:border-ink/20"}`
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.id}
                      checked={form.paymentMethod === m.id}
                      disabled={m.comingSoon}
                      onChange={() => setForm({ ...form, paymentMethod: m.id })}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {m.label}
                        {m.comingSoon && <span className="rounded-full bg-beige px-2 py-0.5 text-[10px] font-medium text-ink/70">Coming Soon</span>}
                      </p>
                      <p className="text-xs text-ink/70">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-ink/70 mt-3">
                bKash and Nagad are launching soon — for now, all orders are placed with Cash on Delivery.
              </p>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-outline flex items-center gap-1.5"><ChevronLeft size={15} /> Back</button>
                <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Review Order</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <h2 className="font-display text-xl">Review Your Order</h2>

              <div className="card-surface p-5 flex items-start justify-between gap-4">
                <div className="text-sm">
                  <p className="font-semibold mb-1">Shipping to</p>
                  <p className="text-ink/70">{form.name} · {form.phone}</p>
                  <p className="text-ink/70">{form.street}, {form.area}, {selectedDistrict?.name}</p>
                  <p className="text-ink/70">{insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
                </div>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-rose-gold-text font-medium hover:underline shrink-0">Edit</button>
              </div>

              <div className="card-surface p-5 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="font-semibold mb-1">Payment method</p>
                  <p className="text-ink/70">{selectedPayment?.label}</p>
                </div>
                <button type="button" onClick={() => setStep(2)} className="text-xs text-rose-gold-text font-medium hover:underline shrink-0">Edit</button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-ink/70">
                <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-rose-gold" /> 100% Authentic, verified</div>
                <div className="flex items-center gap-2"><Truck size={15} className="text-rose-gold" /> {insideDhaka ? "Delivery in 1–3 business days" : "Delivery in 2–5 business days"}</div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-outline flex items-center gap-1.5"><ChevronLeft size={15} /> Back</button>
                <button type="button" onClick={handlePlaceOrder} disabled={loading} className="btn-primary flex-1">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? dict.checkout.placingOrder : dict.checkout.placeOrder}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="bg-beige/50 rounded-xl2 p-6 h-fit space-y-4">
          <h2 className="font-display text-xl">{dict.cart.summary}</h2>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3 text-sm">
                <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-white shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1">{item.name}</p>
                  <p className="text-ink/70 text-xs">Qty {item.quantity}</p>
                </div>
                <span className="font-medium">{formatBDT(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder={dict.cart.coupon} className="flex-1 rounded-full px-4 py-2 text-sm border border-ink/10" />
            <button type="button" onClick={applyCoupon} className="btn-outline !py-2 !text-xs">{dict.cart.apply}</button>
          </div>

          <div className="space-y-2 text-sm border-t border-ink/10 pt-4">
            <div className="flex justify-between"><span className="text-ink/70">{dict.cart.subtotal}</span><span>{formatBDT(subtotal())}</span></div>
            {discount > 0 && <div className="flex justify-between text-rose-gold"><span>{dict.checkout.discount}</span><span>-{formatBDT(discount)}</span></div>}
            <div className="flex justify-between"><span className="text-ink/70">{dict.cart.shipping}</span><span>{formatBDT(shippingFee)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t border-ink/10 pt-2"><span>{dict.checkout.total}</span><span>{formatBDT(total)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
