"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Plus, Star, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import WishlistButton from "./WishlistButton";

interface SuggestionProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number;
  images: string;
  stock: number;
  brand: { name: string };
  category?: { name: string };
  avgRating?: number | null;
  reviewCount?: number;
}

const POPULAR_SEARCHES = ["Sunscreen", "Cleanser", "Serum", "Toner", "Sheet Mask"];
const RECENT_SEARCHES_KEY = "sgb_recent_searches";
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = loadRecentSearches().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-[11px] font-medium text-badge-sale">Out of stock</span>;
  if (stock <= 5) return <span className="text-[11px] font-medium text-gold">Only {stock} left</span>;
  return <span className="text-[11px] font-medium text-success">In stock</span>;
}

export default function SearchOverlay({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Drives the animated gradient ring on the search field (it doubles as the
  // focus indicator, so it needs its own focus state rather than :focus-within).
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState<SuggestionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<SuggestionProduct[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Shared with every product card on the site — see src/lib/wishlist-store.ts.
  const hydrateWishlist = useWishlistStore((s) => s.hydrate);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => setMounted(true), []);

  // The list currently reachable by arrow keys — trending picks while the box is
  // empty, live results once the person starts typing.
  const activeList = query.trim() ? results : trending;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(-1);
    setRecentSearches(loadRecentSearches());
    setTimeout(() => inputRef.current?.focus(), 60);

    // Trending picks + current wishlist state are both cheap, low-stakes fetches —
    // loaded once per open rather than kept live while typing.
    setTrendingLoading(true);
    fetch("/api/products?filter=trending&limit=6")
      .then((r) => r.json())
      .then((d) => setTrending(d.products || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));

    hydrateWishlist();

    return () => {
      setQuery("");
      setResults([]);
    };
    // hydrateWishlist is a zustand store action, referentially stable across
    // renders, so adding it to the deps would change nothing but re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query)}&limit=8`)
        .then((r) => r.json())
        .then((d) => setResults(d.products || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => setActiveIndex(-1), [query]);

  useEffect(() => {
    if (activeIndex >= 0) itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function close() {
    setOpen(false);
  }

  function goToProduct(product: SuggestionProduct) {
    if (query.trim()) saveRecentSearch(query);
    close();
  }

  function submitSearch(term: string) {
    if (!term.trim()) return;
    saveRecentSearch(term);
    close();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  }

  // Wishlist toggling now lives in the shared store (optimistic update, rollback
  // on failure, one toast) so search results and product cards can't disagree.

  function quickAddToCart(product: SuggestionProduct, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const images = parseJsonArray(product.images);
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: images[0] || "",
      price: discountedPrice(product.price, product.discountPercent),
      quantity: 1,
      stock: product.stock,
    });
    close();
    openCart();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, activeList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeList[activeIndex]) {
        const product = activeList[activeIndex];
        if (query.trim()) saveRecentSearch(query);
        close();
        router.push(`/product/${product.slug}`);
      } else if (query.trim()) {
        submitSearch(query);
      }
    }
  }

  const resultRow = (product: SuggestionProduct, index: number) => {
    const images = parseJsonArray(product.images);
    const finalPrice = discountedPrice(product.price, product.discountPercent);
    const isActive = index === activeIndex;
    return (
      <motion.div
        key={product.id}
        ref={(el) => { itemRefs.current[index] = el; }}
        role="option"
        aria-selected={isActive}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        className={`flex items-center gap-4 px-5 py-3 transition-colors ${isActive ? "bg-beige/70" : "hover:bg-beige/50"}`}
        onMouseEnter={() => setActiveIndex(index)}
      >
        <Link href={`/product/${product.slug}`} onClick={() => goToProduct(product)} className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-beige shrink-0 ring-1 ring-ink/5">
            {images[0] && <Image src={images[0]} alt={product.name} fill sizes="64px" className="object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-olive font-medium">{product.brand.name}</p>
            <p className="text-sm font-medium text-ink line-clamp-1">{product.name}</p>
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              {product.category?.name && (
                <span className="text-[11px] text-ink/70">{product.category.name}</span>
              )}
              {typeof product.avgRating === "number" && (
                <span className="flex items-center gap-0.5 text-[11px] text-ink/70">
                  <Star size={11} className="fill-gold text-gold" /> {product.avgRating.toFixed(1)}
                  {product.reviewCount ? ` (${product.reviewCount})` : ""}
                </span>
              )}
              <StockBadge stock={product.stock} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-ink">{formatBDT(finalPrice)}</p>
            {product.discountPercent > 0 && (
              <p className="text-[11px] text-ink/35 line-through">{formatBDT(product.price)}</p>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <WishlistButton
            productId={product.id}
            productName={product.name}
            size={13}
            className="h-8 w-8 rounded-full border border-ink/15 hover:border-rose-gold"
          />
          <button
            onClick={(e) => quickAddToCart(product, e)}
            disabled={product.stock === 0}
            aria-label={`Add ${product.name} to cart`}
            className="h-8 w-8 rounded-full border border-ink/15 flex items-center justify-center hover:border-rose-gold hover:text-rose-gold transition-colors disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={label} className="touch-target hover:text-rose-gold transition-colors active:scale-95">
        <Search size={20} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-md flex items-start justify-center pt-[8vh] px-4"
                onClick={close}
              >
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Search"
                  className="w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-xl2 shadow-e4 overflow-hidden border border-white/60"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={onKeyDown}
                >
                  <div className="flex items-center gap-3 border-b border-border-soft p-4 sm:p-5">
                    {/* Animated brand-gradient ring around the field itself. The
                        pill is always ringed (faint at rest) and saturates + pans
                        while focused, so the gradient doubles as the focus
                        indicator — hence outline-none on the input, which would
                        otherwise stack a second rose outline on top of it. */}
                    <div
                      className={`gradient-ring min-w-0 flex-1 rounded-full transition-shadow duration-300 ease-silk ${
                        searchFocused ? "gradient-ring-active shadow-e2" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3">
                        <Search
                          size={19}
                          className={`shrink-0 transition-colors duration-200 ${searchFocused || query ? "text-rose-gold" : "text-ink/70"}`}
                        />
                        <input
                          ref={inputRef}
                          role="combobox"
                          aria-controls="search-results-listbox"
                          aria-expanded={activeList.length > 0}
                          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setSearchFocused(false)}
                          placeholder="Search for products, brands, or concerns…"
                          className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none placeholder:text-ink/35"
                        />
                        {loading && <Loader2 size={16} className="animate-spin text-ink/30 shrink-0" />}
                        {!loading && query && (
                          <button
                            onClick={() => setQuery("")}
                            aria-label="Clear search"
                            className="shrink-0 text-ink/30 transition-colors hover:text-ink"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={close}
                      aria-label="Close search"
                      className="touch-target shrink-0 rounded-full text-ink/70 transition-colors hover:bg-beige/70 hover:text-ink"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div role="listbox" id="search-results-listbox" className="max-h-[65vh] overflow-y-auto">
                    {/* Empty query: recent + popular + trending */}
                    {!query.trim() && (
                      <div className="p-6 space-y-7">
                        {recentSearches.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs uppercase tracking-wide text-ink/70 flex items-center gap-1.5">
                                <Clock size={12} /> Recent Searches
                              </p>
                              <button
                                onClick={() => {
                                  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
                                  setRecentSearches([]);
                                }}
                                className="text-xs text-ink/35 hover:text-rose-gold-text transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {recentSearches.map((term) => (
                                <button
                                  key={term}
                                  onClick={() => setQuery(term)}
                                  className="text-xs rounded-full border border-ink/10 px-3 py-1.5 hover:border-rose-gold hover:text-rose-gold-text transition-colors"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs uppercase tracking-wide text-ink/70 mb-3">Popular Searches</p>
                          <div className="flex flex-wrap gap-2">
                            {POPULAR_SEARCHES.map((term) => (
                              <button
                                key={term}
                                onClick={() => setQuery(term)}
                                className="text-xs rounded-full border border-ink/10 px-3 py-1.5 hover:border-rose-gold hover:text-rose-gold-text transition-colors"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-ink/70 mb-3 flex items-center gap-1.5">
                            <TrendingUp size={12} /> Trending Now
                          </p>
                          {trendingLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {[0, 1, 2].map((i) => (
                                <div key={i} className="aspect-square rounded-xl bg-beige/60 animate-pulse" />
                              ))}
                            </div>
                          ) : trending.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {trending.slice(0, 6).map((product, i) => {
                                const images = parseJsonArray(product.images);
                                const finalPrice = discountedPrice(product.price, product.discountPercent);
                                const isActive = i === activeIndex;
                                return (
                                  <Link
                                    key={product.id}
                                    ref={(el) => { itemRefs.current[i] = el; }}
                                    href={`/product/${product.slug}`}
                                    onClick={() => goToProduct(product)}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    className={`group rounded-xl overflow-hidden border transition-colors ${isActive ? "border-rose-gold" : "border-border-soft hover:border-rose-gold/50"}`}
                                  >
                                    <div className="relative aspect-square bg-beige overflow-hidden">
                                      {images[0] && (
                                        <Image
                                          src={images[0]}
                                          alt={product.name}
                                          fill
                                          sizes="200px"
                                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                      )}
                                    </div>
                                    <div className="p-2.5">
                                      <p className="text-xs font-medium text-ink line-clamp-1">{product.name}</p>
                                      <p className="text-xs font-semibold text-rose-gold-text mt-0.5">{formatBDT(finalPrice)}</p>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-ink/70">Nothing trending right now — check back soon.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active query: loading / empty / live results */}
                    {query.trim() && loading && (
                      <div className="p-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-4 px-5 py-3">
                            <div className="h-16 w-16 rounded-xl bg-beige/60 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-2.5 w-16 bg-beige/60 rounded animate-pulse" />
                              <div className="h-3 w-40 bg-beige/60 rounded animate-pulse" />
                              <div className="h-2.5 w-24 bg-beige/60 rounded animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {query.trim() && !loading && results.length === 0 && (
                      <div className="p-10 text-center">
                        <p className="text-sm text-ink/70">No products found for "{query}".</p>
                        <p className="text-xs text-ink/35 mt-1">Try a different brand, category, or skin concern.</p>
                      </div>
                    )}

                    {query.trim() && !loading && results.map((product, i) => resultRow(product, i))}

                    {query.trim() && !loading && results.length > 0 && (
                      <button
                        onClick={() => submitSearch(query)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-rose-gold-text font-medium py-4 border-t border-border-soft hover:bg-beige/50 transition-colors"
                      >
                        View all results for "{query}" <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
