"use client";

import { useRouter } from "next/navigation";

export default function SortSelect({ currentSort, baseHref }: { currentSort?: string; baseHref: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const separator = baseHref.includes("?") ? (baseHref.endsWith("?") ? "" : "&") : "?";
    const href = value ? `${baseHref}${separator}sort=${value}` : baseHref;
    router.push(href);
  }

  return (
    // The visible text is inside the options, so the control itself had no
    // accessible name — a screen reader announced only "combo box". The chosen
    // option is not a substitute for a label.
    <select
      aria-label="Sort products"
      defaultValue={currentSort || ""}
      onChange={handleChange}
      className="text-sm rounded-full border border-ink/15 px-4 py-2.5 bg-white hover:border-rose-gold transition-colors cursor-pointer focus-visible:outline-none"
    >
      <option value="">Sort: Newest</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
    </select>
  );
}
