"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqEntry } from "@/lib/faq-data";

/** `entries` comes from the admin-editable FAQ content (Admin → Site Content →
 * FAQ). It falls back to the built-in list so this component still works
 * standalone, and so a page that hasn't been customised behaves exactly as
 * before. Categories stay in code — they carry icons, which are design. */
export default function FaqPageClient({ entries }: { entries?: FaqEntry[] }) {
  const allEntries = entries && entries.length > 0 ? entries : FAQ_ENTRIES;
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Supports deep links like /faq?category=payments (used from the Shipping Policy
  // and Contact pages) so visitors land pre-filtered instead of on the full list.
  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl && FAQ_CATEGORIES.some((c) => c.slug === fromUrl)) setActiveCategory(fromUrl);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((entry) => {
      const matchesCategory = !activeCategory || entry.category === activeCategory;
      const matchesQuery = !q || entry.q.toLowerCase().includes(q) || entry.a.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, allEntries]);

  return (
    <div>
      {/* Search */}
      <div className="relative max-w-md mx-auto mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          aria-label="Search frequently asked questions"
          className="w-full rounded-full border border-border-soft pl-11 pr-10 py-3 text-sm focus:border-rose-gold transition-colors"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 touch-target !min-h-[36px] !min-w-[36px] text-ink/35 hover:text-ink">
            <X size={15} />
          </button>
        )}
      </div>
      {query && (
        <p className="text-center text-xs text-ink/70 mb-8">
          {filtered.length} {filtered.length === 1 ? "result" : "results"} for "{query}"
        </p>
      )}

      {/* Category chips */}
      <div className={`flex flex-wrap justify-center gap-2 ${query ? "mb-12" : "mb-12 mt-5"}`}>
        <button
          onClick={() => setActiveCategory(null)}
          aria-pressed={!activeCategory}
          className={`flex items-center gap-1.5 text-xs rounded-full border px-4 py-2 transition-colors ${
            !activeCategory ? "bg-ink text-white border-ink" : "border-border-soft text-ink/70 hover:border-rose-gold hover:text-rose-gold"
          }`}
        >
          All Questions
        </button>
        {FAQ_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(isActive ? null : cat.slug)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 text-xs rounded-full border px-4 py-2 transition-colors ${
                isActive ? "bg-ink text-white border-ink" : "border-border-soft text-ink/70 hover:border-rose-gold hover:text-rose-gold"
              }`}
            >
              <Icon size={12} /> {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <Search size={28} className="text-ink/20 mx-auto mb-4" />
          <p className="text-sm text-body">No questions match "{query}".</p>
          <p className="text-xs text-ink/70 mt-1">Try a different search, or browse a category above.</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto rounded-xl2 border border-border-soft bg-white overflow-hidden divide-y divide-border-soft">
          <AnimatePresence initial={false}>
            {filtered.map((entry) => (
              <motion.details
                key={entry.q}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="group px-6 py-5"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-sm text-ink">
                  {entry.q}
                  <span className="shrink-0 text-ink/70 transition-transform duration-300 group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="text-sm text-ink/70 leading-relaxed mt-3">{entry.a}</p>
              </motion.details>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
