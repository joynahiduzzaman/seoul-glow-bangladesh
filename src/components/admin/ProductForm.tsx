"use client";

import { useEffect, useRef, useState } from "react";
import ImageUploadField from "./ImageUploadField";
import { PRODUCT_TEXTURES, PRODUCT_TEXTURE_LABELS, type ProductTexture } from "@/lib/product-texture";

export interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  brandId: string;
  categoryId: string;
  description: string;
  price: string;
  costPrice: string;
  discountPercent: string;
  stock: string;
  images: string[];
  status: "ACTIVE" | "DRAFT";
  weightGrams: string;
  volumeMl: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isFlashSale: boolean;
  isTrending: boolean;
  batchNumber: string;
  expiryDate: string; // yyyy-mm-dd, matches <input type="date">
  texture: ProductTexture | "";
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  brandId: "",
  categoryId: "",
  description: "",
  price: "",
  costPrice: "",
  discountPercent: "0",
  stock: "0",
  images: [],
  status: "ACTIVE",
  weightGrams: "",
  volumeMl: "",
  metaTitle: "",
  metaDescription: "",
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: true,
  isFlashSale: false,
  isTrending: false,
  batchNumber: "",
  expiryDate: "",
  texture: "",
};

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border-soft pt-6 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-xs text-ink/70 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** Labelled field wrapper. Every input gets a persistent label + optional help
 * text, rather than relying on a placeholder that disappears the moment you
 * start typing — which is what made the pricing row ambiguous before. */
function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-ink">
        {label} {required && <span className="text-badge-sale">*</span>}
      </label>
      {hint && <p className="mb-1.5 text-[11px] leading-snug text-ink/70">{hint}</p>}
      {children}
    </div>
  );
}

/** Money input with a permanent ৳ prefix inside the control, so the unit is
 * unambiguous whether or not the field is empty. `accent` tints the prefix and
 * focus ring to visually separate cost (what you paid) from selling price
 * (what the customer pays). */
function MoneyInput({
  id,
  value,
  onChange,
  accent = "rose",
  required,
  placeholder = "0.00",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  accent?: "rose" | "amber" | "green";
  required?: boolean;
  placeholder?: string;
}) {
  const tone = {
    rose: { prefix: "text-rose-gold bg-rose-gold/[0.08]", ring: "focus-within:border-rose-gold focus-within:ring-rose-gold/10" },
    amber: { prefix: "text-gold bg-gold/[0.12]", ring: "focus-within:border-gold focus-within:ring-gold/10" },
    green: { prefix: "text-success bg-success/[0.10]", ring: "focus-within:border-success focus-within:ring-success/10" },
  }[accent];

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:ring-4 ${tone.ring}`}
    >
      <span className={`flex items-center px-3.5 text-base font-semibold ${tone.prefix}`} aria-hidden="true">
        ৳
      </span>
      <input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm tabular-nums placeholder:text-ink/30 focus:outline-none"
      />
    </div>
  );
}

export default function ProductForm({
  initialValues,
  submitLabel,
  loading,
  onSubmit,
}: {
  initialValues: ProductFormValues;
  submitLabel: string;
  loading: boolean;
  onSubmit: (values: ProductFormValues) => void;
}) {
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<ProductFormValues>(initialValues);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues.slug));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((d) => {
      setBrands(d.brands);
      setCategories(d.categories);
    });
  }, []);

  // Re-sync if the parent hands us different initial values later (e.g. the edit
  // page finishes fetching the product after this component has already mounted).
  useEffect(() => {
    setForm(initialValues);
    setSlugTouched(Boolean(initialValues.slug));
  }, [initialValues]);

  // Slug auto-follows the name until the admin edits it directly — then it stops
  // following, so a deliberate manual override never gets silently overwritten.
  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  // Per-unit profit, derived live from the two price fields. Null unless both
  // are present and the selling price is non-zero, so an empty cost never
  // renders as a flattering "100% margin".
  const margin = (() => {
    const cost = Number(form.costPrice);
    const sell = Number(form.price);
    if (!form.costPrice || !form.price || !Number.isFinite(cost) || !Number.isFinite(sell) || sell <= 0) return null;
    const profit = sell - cost;
    return { profit, percent: (profit / sell) * 100 };
  })();

  // Live warning as the admin picks a date, mirroring the same 60-day "expiring
  // soon" threshold the dashboard's expiry-alert widget uses — so what's flagged
  // here is never a surprise once it's saved.
  const expiryHint = (() => {
    if (!form.expiryDate) return null;
    const days = Math.ceil((new Date(form.expiryDate).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return "This date is in the past — the product will show as Expired.";
    if (days <= 60) return `Expires in ${days} day${days === 1 ? "" : "s"} — will show under Expiring Soon.`;
    return null;
  })();

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Product name is required");
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) errs.push("Slug can only contain lowercase letters, numbers, and hyphens");
    if (!form.price || Number(form.price) <= 0) errs.push("Price must be greater than 0");
    if (!form.brandId) errs.push("Select a brand");
    if (!form.categoryId) errs.push("Select a category");
    if (!form.description.trim()) errs.push("Description is required");
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-soft p-6 space-y-6">
      {errors.length > 0 && (
        <div className="rounded-lg bg-badge-sale/10 border border-badge-sale/20 p-3.5 text-xs text-badge-sale space-y-1">
          {errors.map((e) => <p key={e}>• {e}</p>)}
        </div>
      )}

      <FormSection title="Basic Information" description="What customers see and how it's found.">
        <Field label="Product Name" hint="Shown on the product page, search results and cards." required htmlFor="name">
          <input
            id="name"
            required
            placeholder="e.g. Advanced Snail 96 Mucin Power Essence"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="field"
          />
        </Field>

        <Field label="URL Slug" hint="The web address for this product. Auto-generated from the name — edit only if you need a specific link.">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-ink/35">/product/</span>
            <input
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
              placeholder={slugify(form.name) || "auto-generated-from-name"}
              className="field flex-1 !py-2 font-mono !text-xs"
            />
            {slugTouched && (
              <button type="button" onClick={() => { setSlugTouched(false); setForm({ ...form, slug: slugify(form.name) }); }} className="shrink-0 text-xs text-rose-gold-text hover:underline">
                Reset
              </button>
            )}
          </div>
        </Field>

        <Field label="SKU" hint="Your internal stock-keeping code. Optional, but makes searching and stock-taking easier." htmlFor="sku">
          <input
            id="sku"
            placeholder="e.g. COSRX-SNAIL-96"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
            className="field font-mono"
          />
        </Field>

        <Field label="Description" hint="What this product does and who it's for. Shown on the product page." required htmlFor="description">
          <textarea
            id="description"
            required
            placeholder="Describe the texture, key ingredients, and the skin concern it targets…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="field resize-y"
          />
        </Field>
      </FormSection>

      <FormSection title="Images">
        <ImageUploadField images={form.images} onChange={(images) => setForm({ ...form, images })} />
      </FormSection>

      <FormSection title="Pricing" description="What you paid, and what the customer pays.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl2 border border-gold/25 bg-gold/[0.05] p-4">
            <Field
              label="💰 Cost Price"
              hint="What you paid your supplier for one unit. Admin-only — never shown to customers."
              htmlFor="costPrice"
            >
              <MoneyInput id="costPrice" accent="amber" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
            </Field>
          </div>

          <div className="rounded-xl2 border border-rose-gold/25 bg-rose-gold/[0.05] p-4">
            <Field
              label="🏷️ Selling Price"
              hint="The price a customer pays, before any discount below."
              required
              htmlFor="price"
            >
              <MoneyInput id="price" accent="rose" required value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            </Field>
          </div>
        </div>

        {/* Live margin readout — only shown once both numbers are real, so it
            never displays a misleading 100% margin against an empty cost. */}
        {margin && (
          <div
            className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl px-4 py-3 text-[13px] ${
              margin.profit >= 0 ? "bg-success/[0.07] text-success" : "bg-badge-sale/[0.07] text-badge-sale"
            }`}
          >
            <span className="font-semibold">{margin.profit >= 0 ? "Profit per unit" : "Loss per unit"}</span>
            <span className="tabular-nums">৳ {Math.abs(margin.profit).toFixed(2)}</span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">{margin.percent.toFixed(1)}% margin</span>
            {margin.profit < 0 && <span className="text-xs opacity-80">Selling below cost.</span>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount %" hint="Percentage off the selling price. Leave at 0 for no discount." htmlFor="discountPercent">
            <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
              <input
                id="discountPercent"
                type="number"
                min={0}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="0"
                className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm tabular-nums placeholder:text-ink/30 focus:outline-none"
              />
              <span className="flex items-center bg-ink/[0.04] px-3.5 text-sm font-semibold text-ink/70" aria-hidden="true">%</span>
            </div>
          </Field>

          <Field label="Stock Quantity" hint="Units available to sell right now." htmlFor="stock">
            <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
              <input
                id="stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm tabular-nums placeholder:text-ink/30 focus:outline-none"
              />
              <span className="flex items-center bg-ink/[0.04] px-3.5 text-xs font-medium text-ink/70" aria-hidden="true">units</span>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Shipping Details" description="Optional — used for courier weight and product specs.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Weight" hint="Package weight in grams." htmlFor="weightGrams">
            <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
              <input
                id="weightGrams"
                type="number"
                step="1"
                min={0}
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                placeholder="0"
                className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm tabular-nums placeholder:text-ink/30 focus:outline-none"
              />
              <span className="flex items-center bg-ink/[0.04] px-3.5 text-xs font-medium text-ink/70" aria-hidden="true">g</span>
            </div>
          </Field>

          <Field label="Volume" hint="Product volume in millilitres." htmlFor="volumeMl">
            <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
              <input
                id="volumeMl"
                type="number"
                step="1"
                min={0}
                value={form.volumeMl}
                onChange={(e) => setForm({ ...form, volumeMl: e.target.value })}
                placeholder="0"
                className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm tabular-nums placeholder:text-ink/30 focus:outline-none"
              />
              <span className="flex items-center bg-ink/[0.04] px-3.5 text-xs font-medium text-ink/70" aria-hidden="true">mL</span>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Authenticity & Freshness" description="Batch tracking and shelf life — shown on the product page and used for the admin expiry-alert dashboard.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Batch Number" hint="Printed on the packaging — lets a customer verify authenticity." htmlFor="batchNumber">
            <input
              id="batchNumber"
              placeholder="e.g. BN-482913"
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
              className="field font-mono"
            />
          </Field>

          <Field label="Texture" hint="How the product feels/applies — shown in product comparisons." htmlFor="texture">
            <select
              id="texture"
              value={form.texture}
              onChange={(e) => setForm({ ...form, texture: e.target.value as ProductFormValues["texture"] })}
              className="field"
            >
              <option value="">Not specified</option>
              {PRODUCT_TEXTURES.map((t) => (
                <option key={t} value={t}>{PRODUCT_TEXTURE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Expiry Date"
          hint={
            expiryHint ??
            "Optional — leave blank for products without a printed hard expiry (e.g. PAO-only packaging)."
          }
          htmlFor="expiryDate"
        >
          <input
            id="expiryDate"
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className={`field !w-auto ${expiryHint ? "border-badge-sale text-badge-sale" : ""}`}
          />
        </Field>
      </FormSection>

      <FormSection title="Organization" description="How this product is grouped and merchandised.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" hint="Which Korean label this product comes from." required htmlFor="brandId">
            <select
              id="brandId"
              required
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              className="field"
            >
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Category" hint="Where it appears when customers browse by type." required htmlFor="categoryId">
            <select
              id="categoryId"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="field"
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status" hint="Drafts are saved but stay hidden from the shop until you set them Active.">
          <div className="flex flex-col gap-2 sm:flex-row">
            {(["ACTIVE", "DRAFT"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={form.status === s}
                onClick={() => setForm({ ...form, status: s })}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-silk ${
                  form.status === s
                    ? s === "ACTIVE"
                      ? "border-success bg-success/[0.08] text-success shadow-e1"
                      : "border-gold bg-gold/[0.10] text-gold shadow-e1"
                    : "border-border-soft text-ink/70 hover:border-ink/20 hover:text-ink"
                }`}
              >
                {s === "ACTIVE" ? "Active — visible in shop" : "Draft — hidden from shop"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Merchandising Tags" hint="Controls which homepage rails and badges this product appears in.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                ["isFeatured", "Featured"],
                ["isBestSeller", "Best Seller"],
                ["isNewArrival", "New Arrival"],
                ["isFlashSale", "Flash Sale"],
                ["isTrending", "Trending"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] transition-all duration-200 ease-silk ${
                  form[key] ? "border-rose-gold bg-rose-gold/[0.07] font-medium text-rose-gold-text" : "border-border-soft text-ink/70 hover:border-ink/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="accent-rose-gold"
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
      </FormSection>

      <FormSection title="Search Engine (SEO)" description="Optional — falls back to the product name and description if left blank.">
        <Field label="Meta Title" hint="The headline Google shows. Aim for under 60 characters." htmlFor="metaTitle">
          <input
            id="metaTitle"
            maxLength={70}
            placeholder="e.g. COSRX Snail Mucin Essence — Authentic Korean Skincare"
            value={form.metaTitle}
            onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
            className="field"
          />
          <p className={`mt-1 text-right text-[11px] tabular-nums ${form.metaTitle.length > 60 ? "text-gold" : "text-ink/35"}`}>
            {form.metaTitle.length}/70
          </p>
        </Field>
        <Field label="Meta Description" hint="The summary under the headline in search results." htmlFor="metaDescription">
          <textarea
            id="metaDescription"
            maxLength={160}
            placeholder="One or two sentences on what the product does and why it's worth buying…"
            rows={3}
            value={form.metaDescription}
            onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
            className="field resize-y"
          />
          <p className={`mt-1 text-right text-[11px] tabular-nums ${form.metaDescription.length > 155 ? "text-gold" : "text-ink/35"}`}>
            {form.metaDescription.length}/160
          </p>
        </Field>
      </FormSection>

      <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : submitLabel}</button>
    </form>
  );
}
