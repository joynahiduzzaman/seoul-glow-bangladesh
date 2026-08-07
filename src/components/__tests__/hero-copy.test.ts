import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The hero's built-in headline and standfirst are switched off, but custom copy
 * must still be typeset exactly as they were. These pin the two halves of that:
 * the defaults are gone, and the styling that rendered them is not.
 */
const hero = readFileSync(path.join(process.cwd(), "src/components/Hero.tsx"), "utf8");

/** Comments explain how to restore the defaults and name them, so the
 *  "is it gone" assertions have to look at code only. */
const heroCode = hero
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("hero default copy", () => {
  it("no longer falls back to the site headline or standfirst", () => {
    expect(heroCode).not.toMatch(/dict\.home\.heroTitleA/);
    expect(heroCode).not.toMatch(/dict\.home\.heroTitleB/);
    expect(heroCode).not.toMatch(/dict\.home\.heroTitleC/);
    expect(heroCode).not.toMatch(/subtitle \|\| dict\.home\.heroDesc/);
  });

  it("keeps the strings themselves, so the defaults can be restored", () => {
    const dict = readFileSync(path.join(process.cwd(), "src/lib/i18n/dictionaries.ts"), "utf8");
    expect(dict).toMatch(/heroTitleA/);
    expect(dict).toMatch(/heroDesc/);
  });

  it("renders nothing where there is no copy", () => {
    expect(hero).toMatch(/\{hasTitle && \(/);
    expect(hero).toMatch(/\{hasSubtitle && \(/);
    // Whitespace-only input must not reserve a headline's worth of space.
    expect(hero).toMatch(/Boolean\(title && title\.trim\(\)\)/);
    expect(hero).toMatch(/Boolean\(subtitle && subtitle\.trim\(\)\)/);
  });

  it("keeps the CTAs working without a headline", () => {
    expect(hero).toMatch(/primaryText \|\| dict\.home\.shopCollection/);
  });
});

describe("custom hero copy styling", () => {
  it("uses the same headline type scale as before", () => {
    expect(hero).toMatch(
      /font-display text-\[2\.85rem\] sm:text-6xl lg:text-\[4\.4rem\] xl:text-\[5\.25rem\] font-semibold leading-\[0\.98\] tracking-\[-0\.025em\] text-white/
    );
  });

  it("uses the same standfirst width, size and leading", () => {
    expect(hero).toMatch(/max-w-\[34ch\] text-\[15px\] leading-\[1\.75\] text-white\/70 sm:text-base/);
  });

  it("keeps the italic rose emphasis available to custom text", () => {
    expect(hero).toMatch(/className="italic text-rose-gold-light"/);
    expect(hero).toMatch(/function renderEmphasis/);
    expect(hero).toMatch(/renderEmphasis\(title!\)/);
  });

  it("keeps the hairline only when it separates two things", () => {
    expect(hero).toMatch(/\{hasTitle && hasSubtitle && <span className="mt-7 h-px w-16 bg-white\/25"/);
  });

  it("leaves the slideshow and image behaviour alone", () => {
    expect(hero).toMatch(/SLIDE_DURATION/);
    expect(hero).toMatch(/AnimatePresence/);
    expect(hero).toMatch(/HeroScrim/);
    expect(hero).toMatch(/HERO_HEIGHT_CLASSES/);
  });
});
