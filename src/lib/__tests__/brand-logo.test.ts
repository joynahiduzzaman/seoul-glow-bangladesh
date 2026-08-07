import { describe, it, expect } from "vitest";
import { trimmedLogoUrl } from "../brand-logo";

const CLOUDINARY =
  "https://res.cloudinary.com/zmhwfgjx/image/upload/v1786093189/seoul-glow-bangladesh/products/logo.png";

describe("trimmedLogoUrl", () => {
  it("inserts the trim transformation into a Cloudinary delivery URL", () => {
    expect(trimmedLogoUrl(CLOUDINARY)).toBe(
      "https://res.cloudinary.com/zmhwfgjx/image/upload/e_trim:10/v1786093189/seoul-glow-bangladesh/products/logo.png"
    );
  });

  it("keeps the version and path intact", () => {
    const out = trimmedLogoUrl(CLOUDINARY);
    expect(out).toContain("/v1786093189/");
    expect(out).toContain("seoul-glow-bangladesh/products/logo.png");
  });

  it("does not stack the transformation if it is already present", () => {
    const once = trimmedLogoUrl(CLOUDINARY);
    expect(trimmedLogoUrl(once)).toBe(once);
    expect(once.match(/e_trim/g)).toHaveLength(1);
  });

  it("leaves non-Cloudinary URLs untouched", () => {
    // Logos uploaded before Cloudinary, or pasted in as a remote URL, must still
    // render rather than being rewritten into a broken path.
    for (const url of [
      "https://images.unsplash.com/photo-123?w=400",
      "/uploads/products/local.png",
      "https://example.com/image/upload/thing.png".replace("res.cloudinary.com", "example.com"),
    ]) {
      expect(trimmedLogoUrl(url)).toBe(url);
    }
  });

  it("returns an empty string for missing values", () => {
    expect(trimmedLogoUrl(null)).toBe("");
    expect(trimmedLogoUrl(undefined)).toBe("");
    expect(trimmedLogoUrl("")).toBe("");
  });
});
