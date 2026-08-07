import { describe, it, expect } from "vitest";
import { benefitVisual } from "../benefit-icons";

/**
 * The live catalogue only uses three benefit phrases, so the browser sweep can
 * only ever exercise three rules. These cover the rest, which is where a
 * mis-ordered pattern would hide.
 */
describe("benefitVisual", () => {
  it("maps the common skincare claims to distinct marks", () => {
    const cases: Array<[string, string]> = [
      ["Hydrates", "#4A6FA5"],
      ["Deeply moisturising", "#4A6FA5"],
      ["Soothes redness", "#5B7B4F"],
      ["Calms irritation", "#5B7B4F"],
      ["Strengthens skin barrier", "#4C5680"],
      ["Brightens dull skin", "#B08040"],
      ["Minimises pores", "#6E5068"],
      ["Firms and lifts", "#4F6B73"],
      ["Controls oil and shine", "#3F6B63"],
      ["Smooths texture", "#8A5A6B"],
    ];
    for (const [benefit, color] of cases) {
      expect(benefitVisual(benefit).color, benefit).toBe(color);
    }
  });

  it("is case-insensitive", () => {
    expect(benefitVisual("HYDRATES").color).toBe(benefitVisual("hydrates").color);
  });

  it("prefers the more specific rule when a phrase matches two", () => {
    // "Strengthens skin barrier" contains both "barrier" and "skin"; barrier is
    // listed first precisely so it does not fall through to a broader rule.
    expect(benefitVisual("Strengthens skin barrier").color).toBe("#4C5680");
    // "Repairs the moisture barrier" mentions moisture too — barrier still wins.
    expect(benefitVisual("Repairs the moisture barrier").color).toBe("#4C5680");
  });

  it("always returns an icon, even for a phrase it does not recognise", () => {
    const v = benefitVisual("Smells lovely");
    expect(v.Icon).toBeTruthy();
    expect(v.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("gives an unrecognised phrase the same mark every time", () => {
    const a = benefitVisual("Dermatologist tested");
    const b = benefitVisual("Dermatologist tested");
    expect(a.color).toBe(b.color);
    expect(a.Icon).toBe(b.Icon);
    // ...and different phrases are not all forced onto one colour.
    const colors = new Set(
      ["Vegan formula", "Cruelty free", "Fragrance free", "Dermatologist tested"].map((s) => benefitVisual(s).color)
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it("handles empty and whitespace input without throwing", () => {
    expect(() => benefitVisual("")).not.toThrow();
    expect(benefitVisual("").Icon).toBeTruthy();
  });
});
