"use client";

import { useMemo, useState } from "react";
import BrandCard, { type BrandCardItem } from "./BrandCard";
import DirectoryFilters from "./DirectoryFilters";
import { ALL, filterByInitial, filterByQuery, initialsOf } from "@/lib/alphabet";

/**
 * The brand directory, with search and an alphabetical index.
 *
 * Filtering happens in the browser rather than through the URL: the whole list
 * is already on the page, so a round trip per keystroke or letter would add a
 * navigation and a flash of re-render to something that should feel instant.
 */
export default function BrandDirectory({ brands }: { brands: BrandCardItem[] }) {
  const [active, setActive] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  const available = useMemo(() => initialsOf(brands.map((b) => b.name)), [brands]);

  // Search wins outright when there is a query — the two are alternative ways
  // of narrowing the same list, never combined.
  const visible = useMemo(
    () =>
      searching
        ? filterByQuery(brands, query, (b) => b.name)
        : filterByInitial(brands, active, (b) => b.name),
    [brands, query, active, searching]
  );

  const reset = () => {
    setQuery("");
    setActive(ALL);
  };

  return (
    <div>
      <DirectoryFilters
        available={available}
        active={active}
        onChange={(next) => {
          setActive(next);
          setQuery("");
        }}
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          if (next) setActive(ALL);
        }}
        total={brands.length}
        resultCount={visible.length}
        noun="brand"
      />

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-xl">
            {searching ? `No brands match “${query.trim()}”` : `No brands starting with ${active}`}
          </p>
          <button
            onClick={reset}
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
              <BrandCard brand={brand} priority={!searching && active === ALL && i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
