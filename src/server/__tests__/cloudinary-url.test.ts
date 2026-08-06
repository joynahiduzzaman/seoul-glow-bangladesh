import { describe, it, expect } from "vitest";
import { publicIdFromUrl } from "@/server/uploads/cloudinary";

/**
 * Only the delivery URL is stored against a category or brand, so replacing an
 * image can only clean up the old asset if the public id can be recovered from
 * that URL. A parser that quietly returns null would leave every replaced image
 * orphaned in Cloudinary — billed for, unreferenced, and invisible until the
 * bill arrives. Nothing about that failure is observable at runtime, which is
 * why it is pinned here.
 */
describe("publicIdFromUrl", () => {
  it("recovers the id from a standard delivery URL", () => {
    expect(
      publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1712345678/seoul-glow-bangladesh/products/abc123.jpg")
    ).toBe("seoul-glow-bangladesh/products/abc123");
  });

  it("handles a URL with no version segment", () => {
    expect(
      publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/seoul-glow-bangladesh/products/abc123.png")
    ).toBe("seoul-glow-bangladesh/products/abc123");
  });

  it("keeps nested folders intact", () => {
    expect(
      publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1/a/b/c/name.webp")
    ).toBe("a/b/c/name");
  });

  it("returns null for a non-Cloudinary URL", () => {
    // Seed data still points at Unsplash; deleting from there is neither
    // possible nor desirable, so these must be ignored rather than mangled.
    expect(publicIdFromUrl("https://images.unsplash.com/photo-123?auto=format")).toBeNull();
  });

  it("returns null for empty, null and undefined", () => {
    expect(publicIdFromUrl("")).toBeNull();
    expect(publicIdFromUrl(null)).toBeNull();
    expect(publicIdFromUrl(undefined)).toBeNull();
  });
});
