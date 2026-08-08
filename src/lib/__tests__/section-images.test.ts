import { describe, it, expect } from "vitest";
import { resolveAuthenticityImages, DEFAULT_AUTHENTICITY_IMAGE } from "@/lib/section-images";

/**
 * The Authenticity panel's photo moved from `settings.image` (one string) to
 * `settings.images` (a list) when it became swipeable. Sections saved before
 * that still carry only the old key, and nothing backfills them — so the day
 * this stops falling back is the day a live homepage silently swaps a shop's
 * own photo for a stock one, with no error anywhere.
 */
describe("resolveAuthenticityImages", () => {
  it("uses the list when there is one", () => {
    expect(resolveAuthenticityImages(["/a.jpg", "/b.jpg"])).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("keeps the order photos were arranged in", () => {
    // The admin drags to reorder and the first is the one shown first.
    expect(resolveAuthenticityImages(["/c.jpg", "/a.jpg", "/b.jpg"])[0]).toBe("/c.jpg");
  });

  it("falls back to the pre-swipe single-photo key", () => {
    expect(resolveAuthenticityImages(undefined, "/legacy.jpg")).toEqual(["/legacy.jpg"]);
    expect(resolveAuthenticityImages([], "/legacy.jpg")).toEqual(["/legacy.jpg"]);
  });

  it("prefers the list over the legacy key when both are set", () => {
    // Saving through the new editor writes both; the list is authoritative.
    expect(resolveAuthenticityImages(["/new.jpg"], "/new.jpg")).toEqual(["/new.jpg"]);
  });

  it("drops blank entries instead of rendering an empty slide", () => {
    expect(resolveAuthenticityImages(["/a.jpg", "", "   ", "/b.jpg"])).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("returns the shipped photo when nothing is configured", () => {
    expect(resolveAuthenticityImages()).toEqual([DEFAULT_AUTHENTICITY_IMAGE]);
    expect(resolveAuthenticityImages([], "  ")).toEqual([DEFAULT_AUTHENTICITY_IMAGE]);
  });

  it("never returns an empty list — the section always has a photo to show", () => {
    for (const args of [[], [[]], [[], ""], [["", ""], ""]] as const) {
      expect(resolveAuthenticityImages(...(args as [])).length).toBeGreaterThan(0);
    }
  });
});
