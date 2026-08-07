"use client";

import { useEffect, useRef, useState } from "react";
import ImageUploadField from "./ImageUploadField";
import { X, Plus } from "lucide-react";
import { PRODUCT_TEXTURES, PRODUCT_TEXTURE_LABELS, type ProductTexture } from "@/lib/product-texture";
import { SKIN_TYPES, SKIN_CONCERNS } from "@/lib/product-attributes";

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
  // Every one of these already existed on the Product model and already renders
  // on the product page. Only the form was missing them, so there was no way to
  // give a product benefits, usage steps or an ingredient list from the admin
  // panel — which is why those sections were empty for every product.
  benefits: string[];
  howToUse: string;
  ingredients: string;
  skinType: string[];
  skinConcern: string[];
  warnings: string;
  countryOfOrigin: string;
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
  benefits: [],
  howToUse: "",
  ingredients: "",
  skinType: [],
  skinConcern: [],
  warnings: "",
  // The model defaults to this and the storefront prints it in the
  // authenticity block, so the form should start where the catalogue does.
  countryOfOrigin: "South Korea",
};

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

/**
 * Repeatable single-line list, for values the model stores as a JSON array.
 *
 * Benefits are rendered on the product page as individual icon marks, so they
 * have to arrive as separate strings — a textarea split on newlines would look
 * the same in the form and then break the moment someone typed a wrapped line.
 */
function ListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const rows = values.length > 0 ? values : [""];

  const setAt = (i: number, value: string) => {
    const next = [...rows];
    next[i] = value;
    onChange(next);
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      {hint && <p className="-mt-1 mb-2 text-xs text-ink/60">{hint}</p>}
      <div className="space-y-2">
        {rows.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={value}
              placeholder={placeholder}
              onChange={(e) => setAt(i, e.target.value)}
              aria-label={`${label} ${i + 1}`}
              className="field !py-2.5"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              // Kept enabled on the last row so a single stray entry can be
              // cleared; the empty row simply reappears.
              aria-label={`Remove ${label} ${i + 1}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink/10 text-ink/45 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, ""])}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-gold-text transition-colors hover:text-ink"
      >
        <Plus size={13} aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}

/** Fixed-vocabulary multi-select. Free text here would create values that the
 *  product page's filter chips never match. */
function ChipField({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      {hint && <p className="-mt-1 mb-2 text-xs text-ink/60">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((s) => s !== option) : [...selected, option])}
              className={`min-h-[36px] rounded-full border px-3.5 text-xs font-medium transition-colors ${
                on
                  ? "border-rose-gold bg-rose-gold/10 text-rose-gold-text"
                  : "border-ink/12 text-ink/65 hover:border-ink/25 hover:text-ink"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Local draft of an in-progress product.
 *
 * Belt to the session keep-alive's braces. Even with the token refreshing in
 * the background a save can still fail — the network drops, the tab is closed
 * by accident, the browser is restarted — and a product with a description, an
 * ingredient list and a set of benefits represents fifteen or twenty minutes of
 * typing. Losing that silently was the worst part of this bug.
 *
 * localStorage rather than a draft row: it survives a crashed tab and a dead
 * session equally, needs no schema change, and never leaves half-finished
 * products in the catalogue. Cleared as soon as the product actually saves.
 */
const DRAFT_KEY = "seoul-glow-admin-product-draft";
const DRAFT_DEBOUNCE_MS = 1200;

function readDraft(): { values: ProductFormValues; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.values ? parsed : null;
  } catch {
    return null;
  }
}

export function clearProductDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private mode or storage disabled — nothing to clear */
  }
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
  draftKeyEnabled = false,
}: {
  initialValues: ProductFormValues;
  submitLabel: string;
  loading: boolean;
  onSubmit: (values: ProductFormValues) => void;
  /** Drafts are only kept for new products — an edit already has a saved
   *  record to fall back on, and restoring a stale draft over a live product
   *  would be worse than losing it. */
  draftKeyEnabled?: boolean;
}) {
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<ProductFormValues>(initialValues);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues.slug));
  const [errors, setErrors] = useState<string[]>([]);
  const [draft, setDraft] = useState<{ values: ProductFormValues; savedAt: number } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((d) => {
      setBrands(d.brands);
      setCategories(d.categories);
    });
  }, []);

  // Offer to restore rather than restoring silently: quietly repopulating a
  // form with work from a previous session is disorienting, and the admin may
  // have moved on deliberately.
  useEffect(() => {
    if (!draftKeyEnabled) return;
    const found = readDraft();
    if (found && found.values.name?.trim()) setDraft(found);
  }, [draftKeyEnabled]);

  // Debounced so a fast typist is not writing to storage on every keystroke.
  useEffect(() => {
    if (!draftKeyEnabled) return;
    const dirty = form.name.trim() || form.description.trim() || form.images.length > 0;
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: form, savedAt: Date.now() }));
        setDraftSavedAt(Date.now());
      } catch {
        /* storage full or disabled — the form still works, just without a net */
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form, draftKeyEnabled]);

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
      {draft && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-gold/25 bg-rose-gold/[0.06] p-3.5 text-xs">
          <span className="flex-1 text-ink/75">
            An unsaved draft of <strong className="text-ink">{draft.values.name || "a product"}</strong> was found from{" "}
            {new Date(draft.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.
          </span>
          <button
            type="button"
            onClick={() => {
              setForm(draft.values);
              setSlugTouched(Boolean(draft.values.slug));
              setDraft(null);
            }}
            className="rounded-full bg-ink px-3.5 py-1.5 font-semibold text-cream"
          >
            Restore it
          </button>
          <button
            type="button"
            onClick={() => {
              clearProductDraft();
              setDraft(null);
            }}
            className="font-semibold text-ink/50 hover:text-ink"
          >
            Discard
          </button>
        </div>
      )}

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

      <FormSection
        title="Product Details"
        description="Everything below already has a place on the product page — benefits appear as icon marks, the ritual block reads the usage steps, and the ingredient list is split into featured actives and the rest."
      >
        <ListField
          label="Key Benefits"
          hint="One claim per line, in the customer's words — “Brightens dark spots”, “No white cast”."
          values={form.benefits}
          onChange={(benefits) => setForm({ ...form, benefits })}
          placeholder="e.g. Brightens dark spots"
          addLabel="Add another benefit"
        />

        <Field label="How to Use" hint="Numbered or plain steps. Shown in the ritual block beside a product photo." htmlFor="howToUse">
          <textarea
            id="howToUse"
            placeholder={"1. Apply to clean, dry skin morning and night.\n2. Pat gently until absorbed.\n3. Follow with moisturiser."}
            value={form.howToUse}
            onChange={(e) => setForm({ ...form, howToUse: e.target.value })}
            rows={4}
            className="field resize-y"
          />
        </Field>

        <Field
          label="Ingredients"
          hint="Full INCI list, comma separated. Recognised actives are featured with what they do; the rest are listed by name."
          htmlFor="ingredients"
        >
          <textarea
            id="ingredients"
            placeholder="Water, Glycerin, Niacinamide, Centella Asiatica Extract, Panthenol…"
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            rows={4}
            className="field resize-y"
          />
        </Field>

        <ChipField
          label="Suitable for"
          hint="Shown as filter chips on the product page."
          options={SKIN_TYPES}
          selected={form.skinType}
          onChange={(skinType) => setForm({ ...form, skinType })}
        />

        <ChipField
          label="Targets these concerns"
          options={SKIN_CONCERNS}
          selected={form.skinConcern}
          onChange={(skinConcern) => setForm({ ...form, skinConcern })}
        />

        <Field label="Warnings & precautions" hint="Patch-test advice, sun sensitivity, what to avoid combining it with." htmlFor="warnings">
          <textarea
            id="warnings"
            placeholder="e.g. Patch-test before first use. Use sunscreen daily when using this product."
            value={form.warnings}
            onChange={(e) => setForm({ ...form, warnings: e.target.value })}
            rows={2}
            className="field resize-y"
          />
        </Field>

        <Field label="Country of Origin" hint="Printed in the authenticity block alongside the batch number." htmlFor="countryOfOrigin">
          <input
            id="countryOfOrigin"
            value={form.countryOfOrigin}
            onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
            placeholder="South Korea"
            className="field"
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

      <div>
        <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : submitLabel}</button>
        {draftKeyEnabled && draftSavedAt && (
          // Visible reassurance that the work is recoverable — the point of the
          // draft is lost if nobody knows it exists.
          <p className="mt-2 text-center text-[11px] text-ink/45">
            Draft saved locally at{" "}
            {new Date(draftSavedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — it will be
            restored if this page is closed before saving.
          </p>
        )}
      </div>
    </form>
  );
}
