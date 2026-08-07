import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The Product model has carried benefits, howToUse, ingredients, skinType,
 * skinConcern, warnings and countryOfOrigin from the start, and the storefront
 * has always rendered them — but nothing wrote them. Two separate ways to lose
 * a field showed up at once:
 *
 *  1. The create handler hardcoded `skinType: "[]"` and friends, so a correct
 *     request body was discarded on the way in.
 *  2. There are three client call sites that build a product payload (the new
 *     page, the edit page, the drawer). Adding a field to the form but to only
 *     two of the three silently drops it on the third.
 *
 * Both are invisible in review and neither throws. These are source checks
 * rather than request tests because the failure is a missing line, not a
 * runtime error.
 */
const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), "utf8");

const PAYLOAD_FIELDS = [
  "benefits",
  "howToUse",
  "ingredients",
  "skinType",
  "skinConcern",
  "warnings",
  "countryOfOrigin",
] as const;

describe("admin product write path keeps every editable field", () => {
  it("the create handler serialises the JSON-array columns from the request", () => {
    const src = read("src/app/api/admin/products/route.ts");
    for (const field of ["benefits", "skinType", "skinConcern"]) {
      expect(src, `${field} is pinned to an empty array instead of using the request value`).not.toMatch(
        new RegExp(`${field}:\\s*"\\[\\]"`)
      );
      expect(src, `${field} is not JSON-serialised on create`).toMatch(new RegExp(`${field}:\\s*JSON.stringify`));
    }
  });

  it("the update handler serialises them too, and treats an emptied list as a real value", () => {
    const src = read("src/app/api/admin/products/[id]/route.ts");
    for (const field of ["benefits", "skinType", "skinConcern"]) {
      // `if (data.x)` would skip an empty array, so clearing every benefit
      // would silently leave the old ones in the database.
      expect(src, `${field} must be checked against undefined, not truthiness`).toMatch(
        new RegExp(`data\\.${field} !== undefined`)
      );
    }
  });

  it.each([
    ["src/app/admin/products/new/page.tsx", "Add Product page"],
    ["src/app/admin/products/[id]/edit/page.tsx", "Edit Product page"],
    ["src/components/admin/ProductDrawer.tsx", "product drawer"],
  ])("%s sends every field the form collects", (file) => {
    const src = read(file);
    const missing = PAYLOAD_FIELDS.filter((f) => !new RegExp(`\\b${f}\\b`).test(src));
    expect(missing, `these fields never reach the API from this call site`).toEqual([]);
  });

  it("the product page renders the fields customers were promised", () => {
    const src = read("src/app/product/[slug]/page.tsx");
    for (const marker of ["benefits", "howToUse", "ingredients", "warnings", "skinType", "skinConcern", "countryOfOrigin"]) {
      expect(src, `${marker} is stored but never shown to the customer`).toMatch(new RegExp(`\\b${marker}\\b`));
    }
  });
});
