import { Truck, CreditCard, RotateCcw, ShieldCheck, UserCircle, type LucideIcon } from "lucide-react";

export interface FaqCategory {
  slug: string;
  label: string;
  icon: LucideIcon;
}

export interface FaqEntry {
  category: string; // matches FaqCategory.slug
  q: string;
  a: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { slug: "orders-shipping", label: "Orders & Shipping", icon: Truck },
  { slug: "payments", label: "Payments", icon: CreditCard },
  { slug: "returns", label: "Returns & Refunds", icon: RotateCcw },
  { slug: "authenticity", label: "Products & Authenticity", icon: ShieldCheck },
  { slug: "account", label: "Account & Support", icon: UserCircle },
];

export const FAQ_ENTRIES: FaqEntry[] = [
  { category: "orders-shipping", q: "How long does delivery take?", a: "Inside Dhaka: 1–3 business days. Outside Dhaka: 2–5 business days via our courier partners." },
  { category: "orders-shipping", q: "How much does shipping cost?", a: "৳70 flat rate inside Dhaka, ৳130 outside Dhaka — the same rate applies regardless of order size." },
  { category: "orders-shipping", q: "Can I track my order?", a: "Yes — once your order ships, you'll receive tracking details via SMS or email. You can also check status anytime from Track Order, no account needed, or from My Account → My Orders if you're signed in." },
  { category: "orders-shipping", q: "Do you ship outside Bangladesh?", a: "Not currently — we only deliver within Bangladesh." },
  { category: "orders-shipping", q: "Can I change my delivery address after ordering?", a: "If your order hasn't shipped yet, contact us via WhatsApp with your order number and we'll update it for you." },

  { category: "payments", q: "What payment methods do you accept?", a: "Cash on Delivery is available nationwide today. bKash and Nagad are launching soon for customers who'd rather pay online." },
  { category: "payments", q: "Is Cash on Delivery available everywhere?", a: "Yes, COD is available across Bangladesh, both inside and outside Dhaka." },
  { category: "payments", q: "When will bKash and Nagad be available?", a: "We're finishing integration with both gateways now — they'll appear as options at checkout as soon as they're live. Cash on Delivery works today with no waiting." },
  { category: "payments", q: "Can I use a coupon code at checkout?", a: "Yes — enter it at checkout, or check My Account → Coupons for codes already available to you." },

  { category: "returns", q: "Can I return a product?", a: "Yes, unopened and unused products can be returned within 7 days of delivery for a full refund." },
  { category: "returns", q: "Can I return an opened skincare product?", a: "Products with broken seals can't be returned for hygiene reasons, unless the item arrived damaged or defective — in that case, contact us immediately with photos." },
  { category: "returns", q: "How do I start a return?", a: "Contact us via WhatsApp or email with your order number, or open a support ticket from My Account → Support Tickets." },
  { category: "returns", q: "How long does a refund take?", a: "Refunds are processed to your original payment method within 5–7 business days of approval." },

  { category: "authenticity", q: "Are your products 100% authentic?", a: "Yes — every product is imported directly from authorized Korean distributors, and carries a batch number and authenticity code you can verify." },
  { category: "authenticity", q: "How do you verify authenticity?", a: "We source directly from brands and their authorized distributors — never grey-market resellers — and check batch/authenticity codes before listing. Full details are on our Authenticity Guarantee page." },
  { category: "authenticity", q: "How do I know a product will suit my skin type?", a: "Each product page lists suitable skin types and key concerns. If you're unsure, message us on WhatsApp for a quick recommendation." },
  { category: "authenticity", q: "Are your products expired or close to expiry?", a: "No — we monitor stock rotation closely and every product sold has ample shelf life remaining." },

  { category: "account", q: "Do I need an account to order?", a: "No — you can check out as a guest and use Track Order anytime afterward with your order number and phone number. Creating an account just lets you save addresses and access your order history, coupons, and wishlist in one place." },
  { category: "account", q: "Do you offer support in Bangla?", a: "Yes — WhatsApp, Messenger, and phone support are available in both Bangla and English." },
  { category: "account", q: "I forgot my password — what do I do?", a: "Use the \"Forgot password?\" link on the login page to reset it via email." },
  { category: "account", q: "Do you have a referral or affiliate program?", a: "Not yet — it's currently in development. Check back soon for details." },
];
