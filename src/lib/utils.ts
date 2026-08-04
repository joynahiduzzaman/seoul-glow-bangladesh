import { SHIPPING_RATES } from "./shipping-zones";

export function formatBDT(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Serialises an object for embedding in a JSON-LD script tag.
 *
 * A plain JSON.stringify is NOT safe here: HTML parsing wins over JSON, so a
 * string containing a closing script tag ends the block early and everything
 * after it is parsed as markup. Our JSON-LD carries admin-editable values
 * (business address, email, product names and descriptions), which makes that
 * a stored-XSS path for anyone with admin access.
 *
 * Escaping the HTML-significant characters keeps the JSON semantically
 * identical while making a tag breakout impossible. U+2028/2029 need no
 * handling here: JSON-LD is read by a JSON parser, not the JS parser.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Only ever allow redirecting to a relative, in-app path — never an absolute URL or a
 * protocol-relative one (e.g. "//evil.com"), which would be an open-redirect risk.
 * Shared by the login page and the OAuth callback routes. */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export function discountedPrice(price: number, discountPercent: number) {
  if (!discountPercent) return price;
  return Math.round(price - (price * discountPercent) / 100);
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SGB${y}${m}${d}-${rand}`;
}

// Delegates to the shared shipping-zone config (src/lib/shipping-zones.ts) so
// there's exactly one place pricing lives — this boolean-based signature stays
// only because Order/Address already store `insideDhaka` as a plain boolean;
// callers that have a real district (checkout, track-order) should prefer
// getShippingFeeForDistrict() instead, which is what actually reads
// SHIPPING_RATES/districts.json.
export function shippingFeeFor(insideDhaka: boolean) {
  return insideDhaka ? SHIPPING_RATES.DHAKA : SHIPPING_RATES.OUTSIDE_DHAKA;
}

/** Bangladeshi mobile numbers: 11 digits, "01" followed by a valid operator
 * prefix digit (3–9), e.g. 01712345678. Accepts an optional +880/880 country
 * code or separators (spaces/dashes) since that's how people actually type
 * phone numbers, but the underlying number must still resolve to that shape. */
export function isValidBDPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return /^1[3-9]\d{8}$/.test(digits);
}

/** Strips everything but digits and drops a leading country code (880) or
 * trunk zero, so "+8801712345678", "01712345678", and "1712345678" all
 * normalize to the same 10-digit "1712345678" for comparison. Used to match a
 * phone number entered on the public Track Order page against the phone
 * stored on the order regardless of how either was formatted. */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function generateReferralCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() || "GLOW";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}
