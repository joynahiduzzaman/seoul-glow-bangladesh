import { describe, it, expect } from "vitest";
import { rank } from "@/server/nav-menu";

/**
 * The header's Brands and Skincare panels used to be hardcoded lists. They
 * advertised Round Lab and Laneige, neither of which had a single product, so
 * clicking either dropped the visitor on an empty page — while a dozen brands
 * the shop actually stocks never appeared in the menu at all.
 *
 * The lists are read from the catalogue now, and `rank` is the whole of the
 * decision: which six entries a panel shows and in what order. The query that
 * feeds it can't be exercised without a database, so the rules it enforces are
 * pinned here instead.
 */
const entry = (name: string, count: number) => ({ name, count });

describe("rank", () => {
  it("puts the best-stocked entries first", () => {
    expect(
      rank([entry("Anua", 2), entry("Mediheal", 3), entry("APLB", 1)]).map((r) => r.name)
    ).toEqual(["Mediheal", "Anua", "APLB"]);
  });

  it("breaks ties alphabetically rather than by insertion order", () => {
    expect(
      rank([entry("Vaseline", 1), entry("Goodal", 1), entry("Moremo", 1)]).map((r) => r.name)
    ).toEqual(["Goodal", "Moremo", "Vaseline"]);
  });

  it("shows at most six, because the panel is two columns of three", () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(`Brand ${i}`, 20 - i));
    expect(rank(many)).toHaveLength(6);
  });

  it("never lists the same name twice, keeping the better-stocked row", () => {
    // The live catalogue has exactly this: two categories both named
    // "Moisturizer", one holding two products and one holding one. A dropdown
    // showing "Moisturizer" twice reads as a broken site.
    const out = rank([entry("Moisturizer", 2), entry("Moisturizer", 1), entry("Serum", 5)]);
    expect(out.map((r) => r.name)).toEqual(["Serum", "Moisturizer"]);
    expect(out.find((r) => r.name === "Moisturizer")!.count).toBe(2);
  });

  it("treats casing and surrounding space as the same name", () => {
    expect(rank([entry("Cosrx", 1), entry(" COSRX ", 2)])).toHaveLength(1);
  });

  it("returns nothing for an empty catalogue rather than throwing", () => {
    expect(rank([])).toEqual([]);
  });
});
