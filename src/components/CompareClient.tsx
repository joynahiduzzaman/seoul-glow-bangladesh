"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, GitCompare, ShoppingBag, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useCompareStore } from "@/lib/compare-store";
import { useCartStore } from "@/lib/cart-store";
import { formatBDT, discountedPrice, parseJsonArray } from "@/lib/utils";
import { PRODUCT_TEXTURE_LABELS, type ProductTexture } from "@/lib/product-texture";

interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  images: string;
  price: number;
  discountPercent: number;
  stock: number;
  ingredients: string | null;
  skinType: string;
  benefits: string;
  texture: ProductTexture | null;
  batchNumber: string | null;
  expiryDate: string | null;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
}

function StockStatus({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-xs font-semibold text-badge-sale">Out of Stock</span>;
  if (stock <= 5) return <span className="text-xs font-semibold text-gold">Only {stock} left</span>;
  return <span className="text-xs font-semibold text-success">In Stock</span>;
}

function ExpiryStatus({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-ink/35">—</span>;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  const formatted = new Date(expiryDate).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  if (days < 0) return <span className="font-medium text-badge-sale">Expired {formatted}</span>;
  if (days <= 60) return <span className="font-medium text-gold">{formatted} ({days}d)</span>;
  return <span>{formatted}</span>;
}

const ROWS: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
  { label: "Brand", render: (p) => <Link href={`/brands/${p.brand.slug}`} className="text-rose-gold hover:underline">{p.brand.name}</Link> },
  { label: "Category", render: (p) => p.category.name },
  {
    label: "Price",
    render: (p) => {
      const final = discountedPrice(p.price, p.discountPercent);
      return (
        <span className="flex items-baseline gap-1.5">
          <span className="font-semibold text-ink">{formatBDT(final)}</span>
          {p.discountPercent > 0 && <span className="text-xs text-ink/35 line-through">{formatBDT(p.price)}</span>}
        </span>
      );
    },
  },
  { label: "Stock Status", render: (p) => <StockStatus stock={p.stock} /> },
  { label: "Texture", render: (p) => (p.texture ? PRODUCT_TEXTURE_LABELS[p.texture] : <span className="text-ink/35">—</span>) },
  {
    label: "Skin Type",
    render: (p) => {
      const types = parseJsonArray(p.skinType);
      return types.length ? (
        <div className="flex flex-wrap gap-1">
          {types.map((t) => <span key={t} className="text-[11px] bg-pastel-green/30 border border-pastel-green rounded-full px-2 py-0.5 capitalize">{t}</span>)}
        </div>
      ) : <span className="text-ink/35">—</span>;
    },
  },
  {
    label: "Benefits",
    render: (p) => {
      const benefits = parseJsonArray(p.benefits);
      return benefits.length ? (
        <ul className="space-y-1 text-ink/70">
          {benefits.map((b) => <li key={b}>• {b}</li>)}
        </ul>
      ) : <span className="text-ink/35">—</span>;
    },
  },
  {
    label: "Ingredients",
    render: (p) => {
      const list = p.ingredients ? p.ingredients.split(",").map((s) => s.trim()).filter(Boolean) : [];
      return list.length ? (
        <p className="text-ink/70 line-clamp-5">{list.join(", ")}</p>
      ) : <span className="text-ink/35">—</span>;
    },
  },
  { label: "Expiry Date", render: (p) => <ExpiryStatus expiryDate={p.expiryDate} /> },
  { label: "Batch Number", render: (p) => p.batchNumber ? <span className="font-mono text-xs">{p.batchNumber}</span> : <span className="text-ink/35">—</span> },
];

export default function CompareClient() {
  const storedItems = useCompareStore((s) => s.items);
  const removeItem = useCompareStore((s) => s.removeItem);
  const clear = useCompareStore((s) => s.clear);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storedItems.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ids = storedItems.map((i) => i.productId).join(",");
    fetch(`/api/products/compare?ids=${ids}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    // storedItems is a new array reference on every store update, but we only care
    // about which ids are selected, so re-fetching whenever the id set changes is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedItems.map((i) => i.productId).join(",")]);

  function addProductToCart(p: CompareProduct) {
    const images = parseJsonArray(p.images);
    addToCart({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: images[0] || "",
      price: discountedPrice(p.price, p.discountPercent),
      quantity: 1,
      stock: p.stock,
    });
    toast.success(`${p.name} added to cart`);
    openCart();
  }

  if (storedItems.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
          <GitCompare size={26} />
        </div>
        <h2 className="font-display text-xl font-semibold mb-2">Nothing to compare yet</h2>
        <p className="text-sm text-ink/70 mb-6">
          Browse the shop and tap the <GitCompare size={13} className="inline -mt-0.5" /> icon on any 2–4 products to line them up here.
        </p>
        <Link href="/shop" className="btn-primary inline-flex items-center gap-2">
          Browse Products <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${storedItems.length}, minmax(0, 1fr))` }}>
        {storedItems.map((i) => (
          <div key={i.productId} className="aspect-[3/4] rounded-xl2 bg-beige/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {products.length < 2 && (
        <div className="max-w-lg mx-auto text-center mb-10 rounded-xl2 bg-gold/[0.08] border border-gold/20 p-5">
          <p className="text-sm text-ink/70">Add at least one more product to see a side-by-side comparison.</p>
          <Link href="/shop" className="text-sm text-rose-gold-text hover:underline mt-2 inline-block">Keep Browsing →</Link>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={clear} className="text-xs text-ink/70 hover:text-rose-gold-text transition-colors">Clear all</button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-border-soft shadow-e1 bg-white">
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(200px, 1fr))` }}
        >
          {/* Product header row: image, name, remove */}
          <div className="sticky left-0 z-10 bg-white border-b border-r border-border-soft" />
          {products.map((p) => {
            const images = parseJsonArray(p.images);
            return (
              <div key={p.id} className="relative border-b border-l border-border-soft p-4 text-center">
                <button
                  onClick={() => removeItem(p.id)}
                  aria-label={`Remove ${p.name} from comparison`}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-ink/30 hover:bg-beige hover:text-ink transition-colors"
                >
                  <X size={14} />
                </button>
                <Link href={`/product/${p.slug}`} className="block">
                  <div className="relative aspect-square w-24 mx-auto rounded-xl overflow-hidden bg-beige mb-3">
                    {images[0] && <Image src={images[0]} alt={p.name} fill sizes="96px" className="object-cover" />}
                  </div>
                  <p className="text-sm font-medium text-ink line-clamp-2 hover:text-rose-gold-text transition-colors">{p.name}</p>
                </Link>
                <button
                  onClick={() => addProductToCart(p)}
                  disabled={p.stock === 0}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-2 text-xs font-medium hover:bg-rose-gold transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ShoppingBag size={12} /> Add to Cart
                </button>
              </div>
            );
          })}

          {/* Attribute rows */}
          {ROWS.map((row, i) => (
            <Fragment key={row.label}>
              <div
                className={`sticky left-0 z-10 bg-beige/40 border-r border-border-soft px-4 py-4 text-xs font-semibold uppercase tracking-wide text-ink/70 ${i === ROWS.length - 1 ? "" : "border-b"}`}
              >
                {row.label}
              </div>
              {products.map((p) => (
                <div
                  key={`${row.label}-${p.id}`}
                  className={`border-l border-border-soft px-4 py-4 text-sm text-ink/80 ${i === ROWS.length - 1 ? "" : "border-b"}`}
                >
                  {row.render(p)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
