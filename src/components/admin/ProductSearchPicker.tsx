"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";

export interface SearchableProduct {
  id: string;
  name: string;
  price: number;
  discountPercent: number;
  stock: number;
  images: string;
  brand: { name: string };
}

/** Fetches the full admin product list once (same list the Products page uses)
 * and searches it client-side — the store's catalog is small enough that this
 * is simpler and snappier than a debounced server round-trip per keystroke. */
export default function ProductSearchPicker({ onSelect }: { onSelect: (product: SearchableProduct) => void }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }, []);

  const results = query.trim().length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Loading products…" : "Search products to add…"}
          disabled={loading}
          className="w-full rounded-lg border border-ink/10 pl-9 pr-4 py-2.5 text-sm"
        />
      </div>
      {open && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-ink/5 max-h-72 overflow-y-auto">
          {results.length === 0 && <p className="text-xs text-ink/70 p-3">No matching products.</p>}
          {results.map((p) => {
            const thumb = parseJsonArray(p.images)[0];
            const price = discountedPrice(p.price, p.discountPercent);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-beige/60 text-left"
              >
                <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-beige shrink-0">
                  {thumb && <Image src={thumb} alt={p.name} fill sizes="36px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-ink/70">{p.brand.name} · {formatBDT(price)} · {p.stock} in stock</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
