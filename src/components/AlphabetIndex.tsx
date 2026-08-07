"use client";

import { ALL, LETTERS, OTHER } from "@/lib/alphabet";

/**
 * The A–Z index shared by the brand and category directories.
 *
 * Controlled: the parent owns the active letter and does the filtering, so this
 * stays a presentational control and the two directories cannot drift apart.
 *
 * Every letter is rendered whether or not it has entries, because the index
 * doubles as a map of the catalogue — showing only stocked letters gives a row
 * that shifts as stock changes and is harder to scan. Empty letters are visibly
 * inert rather than clickable dead ends.
 */
export default function AlphabetIndex({
  available,
  active,
  onChange,
  total,
  resultCount,
  noun,
}: {
  /** Initials that actually have entries. */
  available: Set<string>;
  active: string;
  onChange: (next: string) => void;
  total: number;
  resultCount: number;
  /** Singular noun, e.g. "brand" or "category". */
  noun: string;
}) {
  const keys = available.has(OTHER) ? [...LETTERS, OTHER] : LETTERS;
  const plural = (n: number) => (n === 1 ? noun : noun === "category" ? "categories" : `${noun}s`);

  return (
    <div className="mb-8 sm:mb-10">
      {/* 26 letters plus a double-width "All" is 28 cells, so a 14-column grid
          is exactly two rows at every size. Flex-wrap gave a ragged split, and
          seven columns on a phone stacked it four rows deep.
          14 columns is past Tailwind's built-in scale, so the track list is
          written out rather than adding a one-off key to the theme. */}
      <div
        role="group"
        aria-label={`Filter ${plural(2)} by first letter`}
        className="mx-auto grid max-w-4xl grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 rounded-xl2 border border-rose-gold/20 bg-gradient-to-br from-white via-cream to-soft-pink/40 p-1.5 shadow-e2 sm:gap-2 sm:p-3"
      >
        <IndexButton
          label="All"
          active={active === ALL}
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
              active={active === key}
              disabled={!has}
              onClick={() => onChange(key)}
              srLabel={has ? `Show ${plural(2)} starting with ${key}` : `No ${plural(2)} starting with ${key}`}
            />
          );
        })}
      </div>

      <p aria-live="polite" className="mt-4 text-center text-xs text-ink/55">
        {active === ALL
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
