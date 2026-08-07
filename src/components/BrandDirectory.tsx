"use client";

import { useMemo, useState } from "react";
import BrandCard, { type BrandCardItem } from "./BrandCard";

const ALL = "ALL";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Bucket for anything that does not start with A–Z — "3CE", "9wishes" and the
 *  like. Only offered when such a brand actually exists. */
const OTHER = "#";

function initialOf(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : OTHER;
}

/**
 * The brand directory with its alphabetical index.
 *
 * Filtering happens in the browser rather than through the URL: the whole list
 * is twelve records and already on the page, so a round trip per letter would
 * add a navigation and a flash of re-render to something that should feel
 * instant.
 *
 * Every letter A–Z is shown whether or not it has brands, because the index is
 * also a map of the catalogue — a jumping row of only the letters that happen
 * to be stocked is harder to scan and shifts under you as stock changes. The
 * empty ones are visibly inert rather than clickable dead ends.
 */
export default function BrandDirectory({ brands }: { brands: BrandCardItem[] }) {
  const [active, setActive] = useState<string>(ALL);

  const available = useMemo(() => new Set(brands.map((b) => initialOf(b.name))), [brands]);

  const keys = useMemo(
    () => (available.has(OTHER) ? [...LETTERS, OTHER] : LETTERS),
    [available]
  );

  const visible = useMemo(
    () => (active === ALL ? brands : brands.filter((b) => initialOf(b.name) === active)),
    [brands, active]
  );

  return (
    <div>
      {/* ── Alphabetical index ──────────────────────────────────────────── */}
      <div className="mb-8 sm:mb-10">
        {/* A grid rather than flex-wrap: 26 letters plus a double-width "All"
            is 28 cells, which lands on exactly four rows of seven on a phone and
            two rows of fourteen from `sm` up. Wrapping a flex row instead left a
            ragged 16-then-11 split that read as an accident. */}
        <div
          role="group"
          aria-label="Filter brands by first letter"
          // 14 columns is past Tailwind's built-in scale, so the track list is
          // written out rather than adding a one-off key to the theme.
          className="mx-auto grid max-w-3xl grid-cols-7 gap-1.5 rounded-xl2 border border-border-soft bg-white/70 p-2.5 shadow-e1 sm:grid-cols-[repeat(14,minmax(0,1fr))] sm:gap-2 sm:p-3"
        >
          <FilterButton
            label="All"
            active={active === ALL}
            onClick={() => setActive(ALL)}
            wide
            srLabel={`Show all ${brands.length} brands`}
          />

          {keys.map((key) => {
            const has = available.has(key);
            return (
              <FilterButton
                key={key}
                label={key}
                active={active === key}
                disabled={!has}
                onClick={() => setActive(key)}
                srLabel={has ? `Show brands starting with ${key}` : `No brands starting with ${key}`}
              />
            );
          })}
        </div>

        <p aria-live="polite" className="mt-4 text-center text-xs text-ink/55">
          {active === ALL
            ? `Showing all ${brands.length} ${brands.length === 1 ? "brand" : "brands"}`
            : `${visible.length} ${visible.length === 1 ? "brand" : "brands"} starting with ${active}`}
        </p>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-xl">No brands starting with {active}</p>
          <button
            onClick={() => setActive(ALL)}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-ink/15 px-6 text-sm font-semibold transition-colors hover:border-rose-gold hover:text-rose-gold-text"
          >
            Show all brands
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:gap-6">
          {visible.map((brand, i) => (
            <li key={brand.id}>
              {/* Only the unfiltered first row is a genuine LCP candidate; after
                  a filter the images are already cached. */}
              <BrandCard brand={brand} priority={active === ALL && i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  disabled,
  onClick,
  wide,
  srLabel,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  wide?: boolean;
  srLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={disabled ? undefined : active}
      // The visible label is a bare letter; the accessible name says what
      // pressing it does.
      aria-label={srLabel}
      className={[
        // Cells stretch to the grid track; h-9 keeps every one at 36px, clearing
        // the 24px minimum touch target with room to spare.
        "inline-flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-300 ease-silk",
        // "All" takes two tracks so the remaining 26 cells divide evenly.
        wide ? "col-span-2" : "",
        disabled
          ? "cursor-default text-ink/20"
          : active
            ? "bg-ink text-cream shadow-e1"
            : "text-ink/65 hover:bg-beige hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
