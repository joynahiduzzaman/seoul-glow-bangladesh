"use client";

import { Search, X } from "lucide-react";
import { ALL, LETTERS, OTHER } from "@/lib/alphabet";

/**
 * The search box and A–Z index shared by the brand and category directories.
 *
 * Controlled: the parent owns both the query and the active letter and does the
 * filtering, so this stays presentational and the two directories cannot drift
 * apart.
 *
 * Search and letter are alternative ways of narrowing the same list, never
 * combined — typing clears the letter and picking a letter clears the query.
 * Intersecting them produces empty results that look like a bug ("I searched
 * for cosrx and got nothing" because C was still selected).
 *
 * Every letter is rendered whether or not it has entries, because the index
 * doubles as a map of the catalogue. Empty letters are visibly inert rather
 * than clickable dead ends.
 */
export default function DirectoryFilters({
  available,
  active,
  onChange,
  query,
  onQueryChange,
  total,
  resultCount,
  noun,
}: {
  /** Initials that actually have entries. */
  available: Set<string>;
  active: string;
  onChange: (next: string) => void;
  query: string;
  onQueryChange: (next: string) => void;
  total: number;
  resultCount: number;
  /** Singular noun, e.g. "brand" or "category". */
  noun: string;
}) {
  const keys = available.has(OTHER) ? [...LETTERS, OTHER] : LETTERS;
  const plural = (n: number) => (n === 1 ? noun : noun === "category" ? "categories" : `${noun}s`);
  const searching = query.trim().length > 0;

  return (
    <div className="mb-8 sm:mb-10">
      {/* Search and letters live in one panel so they read as a single control.
          Side by side from xl, where there is width for both; stacked below,
          because a 28-cell row already needs the full width at lg. */}
      <div className="mx-auto flex max-w-4xl flex-col gap-2 rounded-xl2 border border-rose-gold/20 bg-gradient-to-br from-white via-cream to-soft-pink/40 p-1.5 shadow-e2 sm:gap-3 sm:p-3 lg:max-w-5xl xl:max-w-6xl xl:flex-row xl:items-center">
        {/* ── Search ──────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 xl:w-64">
          <label htmlFor={`dir-search-${noun}`} className="sr-only">
            Search {plural(2)} by name
          </label>
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-gold-text/60"
          />
          <input
            id={`dir-search-${noun}`}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={`Search ${plural(2)}…`}
            autoComplete="off"
            // type=search keeps the semantics and gives phones a Search key on
            // the keyboard, but WebKit also draws its own cancel button — which
            // sat right next to ours, so the field showed two clear affordances.
            className="h-10 w-full rounded-lg border border-rose-gold/20 bg-white/80 pl-10 pr-9 text-sm text-ink placeholder:text-ink/40 transition-all duration-300 focus:border-rose-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-gold/25 sm:h-9 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searching && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink/40 transition-colors hover:bg-beige hover:text-rose-gold-text"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Hairline between the two controls once they share a row. */}
        <span aria-hidden="true" className="hidden w-px self-stretch bg-rose-gold/15 xl:block" />

        {/* ── A–Z index ───────────────────────────────────────────────────── */}
        {/* 26 letters plus a double-width "All" is 28 cells: two rows of
            fourteen, or one row of twenty-eight once there is width for it.
            One row only from lg — at the sm container a 28-cell row leaves each
            cell about 17px, well under the 24px touch target.
            These track counts are past Tailwind's built-in scale, so the lists
            are written out rather than adding one-off keys to the theme. */}
        <div
          role="group"
          aria-label={`Filter ${plural(2)} by first letter`}
          className="grid min-w-0 flex-1 grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 sm:gap-2 lg:grid-cols-[repeat(28,minmax(0,1fr))] lg:gap-1"
        >
          <IndexButton
            label="All"
            active={!searching && active === ALL}
            onClick={() => onChange(ALL)}
            wide
            srLabel={`Show all ${total} ${plural(total)}`}
          />

          {keys.map((key) => {
            const has = available.has(key);
            return (
              <IndexButton
                key={key}
                label={key}
                active={!searching && active === key}
                disabled={!has}
                onClick={() => onChange(key)}
                srLabel={has ? `Show ${plural(2)} starting with ${key}` : `No ${plural(2)} starting with ${key}`}
              />
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="mt-4 text-center text-xs text-ink/55">
        {searching
          ? `${resultCount} ${plural(resultCount)} matching “${query.trim()}”`
          : active === ALL
            ? `Showing all ${total} ${plural(total)}`
            : `${resultCount} ${plural(resultCount)} starting with ${active}`}
      </p>
    </div>
  );
}

function IndexButton({
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
        // Cells stretch to the grid track. Fourteen across a 320px phone leaves
        // them narrower than the 24px guideline, so the height carries the tap
        // target instead — 40px on mobile, easing back to 36px once the row has
        // room to breathe.
        "inline-flex h-10 w-full items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all duration-300 ease-silk sm:h-9 sm:text-xs",
        // "All" takes two tracks so the remaining 26 cells divide evenly.
        wide ? "col-span-2" : "",
        disabled
          ? "cursor-default text-ink/20"
          : active
            ? // Deep rose rather than the flat ink: cream on #994D4D measures
              // 5.6:1, where cream on the lighter brand rose-gold would be 2.9
              // and fail. The gradient stays within the accessible end.
              "scale-[1.06] bg-gradient-to-br from-rose-gold-text to-[#7D3F3F] text-cream shadow-e2"
            : "bg-white/70 text-rose-gold-text hover:bg-rose-gold-text hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
