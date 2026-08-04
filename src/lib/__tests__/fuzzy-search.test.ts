import { describe, it, expect } from "vitest";
import { isFuzzyMatch } from "../fuzzy-search";

describe("isFuzzyMatch", () => {
  it("matches an exact substring", () => {
    expect(isFuzzyMatch("snail", "Advanced Snail 96 Mucin Power Essence")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isFuzzyMatch("COSRX", "cosrx")).toBe(true);
  });

  it("tolerates a single-letter typo on a short word", () => {
    expect(isFuzzyMatch("serem", "Serum")).toBe(true);
  });

  it("tolerates a missing letter on a longer word", () => {
    expect(isFuzzyMatch("sunscren", "Sunscreen")).toBe(true);
  });

  it("matches a typo'd word inside a longer product name", () => {
    expect(isFuzzyMatch("toner", "Heartleaf 77% Toner Pad")).toBe(true);
  });

  it("does not match unrelated words", () => {
    expect(isFuzzyMatch("sunscreen", "Cleanser")).toBe(false);
  });

  it("returns false for an empty query", () => {
    expect(isFuzzyMatch("", "Anything")).toBe(false);
  });

  it("rejects a short query against a completely different short word", () => {
    expect(isFuzzyMatch("gel", "oil")).toBe(false);
  });
});
