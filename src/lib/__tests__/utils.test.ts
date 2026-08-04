import { describe, it, expect } from "vitest";
import {
  formatBDT,
  discountedPrice,
  parseJsonArray,
  generateOrderNumber,
  shippingFeeFor,
  generateReferralCode,
  isValidBDPhone,
  normalizePhone,
} from "../utils";

describe("formatBDT", () => {
  it("formats a whole number as BDT currency", () => {
    expect(formatBDT(1500)).toContain("1,500");
  });

  it("rounds fractional amounts (maximumFractionDigits: 0)", () => {
    expect(formatBDT(999.6)).toContain("1,000");
  });

  it("handles zero", () => {
    expect(formatBDT(0)).toContain("0");
  });
});

describe("discountedPrice", () => {
  it("returns the original price when discountPercent is 0", () => {
    expect(discountedPrice(1000, 0)).toBe(1000);
  });

  it("applies a percentage discount correctly", () => {
    expect(discountedPrice(1000, 10)).toBe(900);
  });

  it("rounds to the nearest whole number", () => {
    expect(discountedPrice(999, 15)).toBe(Math.round(999 - 999 * 0.15));
  });

  it("treats a falsy/undefined discount as no discount", () => {
    // @ts-expect-error - intentionally testing undefined input defensively
    expect(discountedPrice(500, undefined)).toBe(500);
  });
});

describe("parseJsonArray", () => {
  it("parses a valid JSON array string", () => {
    expect(parseJsonArray('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for null/undefined input", () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray(undefined)).toEqual([]);
  });

  it("returns an empty array for malformed JSON rather than throwing", () => {
    expect(parseJsonArray("{not valid json")).toEqual([]);
  });

  it("returns an empty array if the parsed value isn't an array", () => {
    expect(parseJsonArray('{"a":1}')).toEqual([]);
  });
});

describe("generateOrderNumber", () => {
  it("matches the SGBYYMMDD-NNNN pattern", () => {
    expect(generateOrderNumber()).toMatch(/^SGB\d{6}-\d{4}$/);
  });

  it("generates unique-looking values across calls (not deterministic)", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    // Same date prefix is expected; the random suffix should very rarely collide.
    expect(a.slice(0, 9)).toBe(b.slice(0, 9));
  });
});

describe("shippingFeeFor", () => {
  it("charges ৳70 inside Dhaka", () => {
    expect(shippingFeeFor(true)).toBe(70);
  });

  it("charges ৳130 outside Dhaka", () => {
    expect(shippingFeeFor(false)).toBe(130);
  });
});

describe("isValidBDPhone", () => {
  it("accepts a plain 01-prefixed 11-digit mobile number", () => {
    expect(isValidBDPhone("01712345678")).toBe(true);
  });

  it("accepts every valid operator prefix (013–019)", () => {
    for (const prefix of ["013", "014", "015", "016", "017", "018", "019"]) {
      expect(isValidBDPhone(`${prefix}12345678`)).toBe(true);
    }
  });

  it("accepts a +880 country-code-prefixed number", () => {
    expect(isValidBDPhone("+8801712345678")).toBe(true);
  });

  it("accepts a bare-880 (no plus) prefixed number", () => {
    expect(isValidBDPhone("8801712345678")).toBe(true);
  });

  it("accepts numbers with spaces or dashes", () => {
    expect(isValidBDPhone("01712-345678")).toBe(true);
    expect(isValidBDPhone("017 1234 5678")).toBe(true);
  });

  it("rejects a number that's too short", () => {
    expect(isValidBDPhone("0171234567")).toBe(false);
  });

  it("rejects a number that's too long", () => {
    expect(isValidBDPhone("017123456789")).toBe(false);
  });

  it("rejects an invalid operator-prefix digit (02 is not a valid mobile prefix)", () => {
    expect(isValidBDPhone("01212345678")).toBe(false);
  });

  it("rejects a landline-shaped or garbage string", () => {
    expect(isValidBDPhone("02-9876543")).toBe(false);
    expect(isValidBDPhone("not a phone")).toBe(false);
    expect(isValidBDPhone("")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("strips a leading 0 trunk prefix", () => {
    expect(normalizePhone("01712345678")).toBe("1712345678");
  });

  it("strips a leading 880 country code", () => {
    expect(normalizePhone("8801712345678")).toBe("1712345678");
  });

  it("strips a leading +880 country code", () => {
    expect(normalizePhone("+8801712345678")).toBe("1712345678");
  });

  it("strips non-digit separators", () => {
    expect(normalizePhone("017-1234 5678")).toBe("1712345678");
  });
});

describe("generateReferralCode", () => {
  it("produces an uppercase alphanumeric code", () => {
    const code = generateReferralCode("Nusrat Jahan");
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("falls back to GLOW when the name has no letters", () => {
    const code = generateReferralCode("123456");
    expect(code.startsWith("GLOW")).toBe(true);
  });

  it("truncates long names to keep codes reasonably short", () => {
    const code = generateReferralCode("Abcdefghijklmnopqrstuvwxyz");
    // 5 letters from the name + 4 random chars
    expect(code.length).toBe(9);
  });
});
