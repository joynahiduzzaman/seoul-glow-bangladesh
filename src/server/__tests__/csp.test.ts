import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The CSP lives in next.config.mjs, which cannot be imported here without
 * pulling in the whole Next config surface, so it is read as text. That is
 * enough: these assertions are about directives being present, and a directive
 * that is missing from the file is missing from the header.
 */
const config = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
const imgSrc = config.match(/"img-src ([^"]+)"/)?.[1] ?? "";

describe("content security policy", () => {
  it("allows blob: images", () => {
    // The admin category, brand and product image fields preview a picked file
    // with URL.createObjectURL before the upload finishes. Without blob: the
    // browser blocks that preview and the tile stays empty until the round trip
    // completes — the exact uncertainty the preview exists to remove. This
    // regressed silently once because a blocked <img> still renders an element.
    expect(imgSrc).toContain("blob:");
  });

  it("still allows data: and https: images", () => {
    expect(imgSrc).toContain("data:");
    expect(imgSrc).toContain("https:");
  });

  it("does not open img-src to everything", () => {
    expect(imgSrc).not.toContain("*");
  });

  it("keeps object-src locked down", () => {
    expect(config).toContain("\"object-src 'none'\"");
  });
});
