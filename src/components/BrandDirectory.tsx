"use client";

import { useMemo, useState } from "react";
import BrandCard, { type BrandCardItem } from "./BrandCard";
import AlphabetIndex from "./AlphabetIndex";
import { ALL, filterByInitial, initialsOf } from "@/lib/alphabet";

/**
 * The brand directory with its alphabetical index.
 *
 * Filtering happens in the browser rather than through the URL: the whole list
 * is already on the page, so a round trip per letter would add a navigation and
 * a flash of re-render to something that should feel instant.
 */
export default function BrandDirectory({ brands }: { brands: BrandCardItem[] }) {
  const [active, setActive] = useState<string>(ALL);

  const available = useMemo(() => initialsOf(brands.map((b) => b.name)), [brands]);
  const visible = useMemo(() => filterByInitial(brands, active, (b) => b.name), [brands, active]);

  return (
    <div>
      <AlphabetIndex
        available={available}
        active={active}
        onChange={setActive}
        total={brands.length}
        resultCount={visible.length}
        noun="brand"
      />

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
