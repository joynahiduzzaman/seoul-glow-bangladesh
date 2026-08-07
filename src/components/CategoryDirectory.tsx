"use client";

import { useMemo, useState } from "react";
import CategoryCard, { type CategoryCardItem } from "./CategoryCard";
import AlphabetIndex from "./AlphabetIndex";
import { ALL, filterByInitial, initialsOf } from "@/lib/alphabet";

/** The category directory, sharing its A–Z index with the brand directory. */
export default function CategoryDirectory({ categories }: { categories: CategoryCardItem[] }) {
  const [active, setActive] = useState<string>(ALL);

  const available = useMemo(() => initialsOf(categories.map((c) => c.name)), [categories]);
  const visible = useMemo(() => filterByInitial(categories, active, (c) => c.name), [categories, active]);

  return (
    <div>
      <AlphabetIndex
        available={available}
        active={active}
        onChange={setActive}
        total={categories.length}
        resultCount={visible.length}
        noun="category"
      />

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-xl">No categories starting with {active}</p>
          <button
            onClick={() => setActive(ALL)}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-ink/15 px-6 text-sm font-semibold transition-colors hover:border-rose-gold hover:text-rose-gold-text"
          >
            Show all categories
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:gap-6">
          {visible.map((category, i) => (
            <li key={category.id}>
              <CategoryCard category={category} priority={active === ALL && i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
