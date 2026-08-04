import { describe, it, expect } from "vitest";
import { safeJsonLd } from "../utils";

describe("safeJsonLd", () => {
  it("neutralises a script-tag breakout in an admin-editable value", () => {
    // The realistic attack: an admin pastes this into a product name or the
    // business address, and it lands inside <script type="application/ld+json">.
    const payload = { name: 'Serum</script><script>alert(document.cookie)</script>' };
    const out = safeJsonLd(payload);

    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    // Still valid JSON carrying the original text, so structured data is intact.
    expect(JSON.parse(out).name).toBe(payload.name);
  });

  it("escapes every HTML-significant character", () => {
    const out = safeJsonLd({ v: "<>&" });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out).v).toBe("<>&");
  });

  it("leaves ordinary content readable and round-trippable", () => {
    const obj = { "@type": "Product", name: "Snail 96 Mucin Essence", price: 1150 };
    expect(JSON.parse(safeJsonLd(obj))).toEqual(obj);
  });
});
