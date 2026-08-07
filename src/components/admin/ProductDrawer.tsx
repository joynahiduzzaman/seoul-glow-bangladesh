"use client";

import { fetchWithSession } from "@/lib/admin/session-fetch";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import ProductForm, { EMPTY_PRODUCT_FORM, ProductFormValues } from "./ProductForm";
import { parseJsonArray } from "@/lib/utils";

export type DrawerState = { mode: "create" } | { mode: "edit"; productId: string } | null;

export default function ProductDrawer({ state, onClose }: { state: DrawerState; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [initialValues, setInitialValues] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);

  useEffect(() => {
    if (state?.mode === "edit") {
      setFetching(true);
      fetch(`/api/admin/products/${state.productId}`)
        .then((r) => r.json())
        .then((d) => {
          const p = d.product;
          if (!p) {
            toast.error("Product not found");
            onClose();
            return;
          }
          setInitialValues({
            name: p.name,
            slug: p.slug,
            sku: p.sku || "",
            brandId: p.brandId,
            categoryId: p.categoryId,
            description: p.description,
            price: String(p.price),
            costPrice: p.costPrice != null ? String(p.costPrice) : "",
            discountPercent: String(p.discountPercent),
            stock: String(p.stock),
            images: parseJsonArray(p.images),
            status: p.status,
            weightGrams: p.weightGrams != null ? String(p.weightGrams) : "",
            volumeMl: p.volumeMl != null ? String(p.volumeMl) : "",
            metaTitle: p.metaTitle || "",
            metaDescription: p.metaDescription || "",
            isFeatured: p.isFeatured,
            isBestSeller: p.isBestSeller,
            isNewArrival: p.isNewArrival,
            isFlashSale: p.isFlashSale,
            isTrending: p.isTrending,
            batchNumber: p.batchNumber || "",
            texture: p.texture || "",
          benefits: parseJsonArray(p.benefits),
          howToUse: p.howToUse || "",
          ingredients: p.ingredients || "",
          skinType: parseJsonArray(p.skinType),
          skinConcern: parseJsonArray(p.skinConcern),
          warnings: p.warnings || "",
          countryOfOrigin: p.countryOfOrigin || "South Korea",
            expiryDate: p.expiryDate ? String(p.expiryDate).slice(0, 10) : "",
          });
        })
        .catch(() => toast.error("Failed to load product"))
        .finally(() => setFetching(false));
    } else if (state?.mode === "create") {
      setInitialValues(EMPTY_PRODUCT_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.mode === "edit" ? state.productId : state?.mode]);

  async function handleSubmit(form: ProductFormValues) {
    if (!state) return; // only ever called from the form rendered inside the `state &&` block below
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        sku: form.sku || undefined,
        brandId: form.brandId,
        categoryId: form.categoryId,
        description: form.description,
        price: Number(form.price),
          costPrice: form.costPrice ? Number(form.costPrice) : null,
        discountPercent: Number(form.discountPercent),
        stock: Number(form.stock),
        images: form.images,
        status: form.status,
        weightGrams: form.weightGrams ? Math.round(Number(form.weightGrams)) : null,
        volumeMl: form.volumeMl ? Math.round(Number(form.volumeMl)) : null,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        isFeatured: form.isFeatured,
        isBestSeller: form.isBestSeller,
        isNewArrival: form.isNewArrival,
        isFlashSale: form.isFlashSale,
        isTrending: form.isTrending,
        batchNumber: form.batchNumber || null,
        texture: form.texture || null,
        expiryDate: form.expiryDate || null,
        benefits: form.benefits.filter((b) => b.trim()),
        howToUse: form.howToUse || null,
        ingredients: form.ingredients || null,
        skinType: form.skinType,
        skinConcern: form.skinConcern,
        warnings: form.warnings || null,
        countryOfOrigin: form.countryOfOrigin || undefined,
      };
      const isEdit = state.mode === "edit";
      const res = await fetchWithSession(isEdit ? `/api/admin/products/${state.productId}` : "/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Product updated" : "Product created");
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {state && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-xl bg-cream h-full overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 backdrop-blur border-b border-border-soft px-6 py-4">
              <h2 className="font-display text-xl">{state.mode === "edit" ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={onClose} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={20} /></button>
            </div>
            <div className="p-6">
              {fetching ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-beige rounded-lg" />
                  <div className="h-32 bg-beige rounded-lg" />
                  <div className="h-10 bg-beige rounded-lg" />
                </div>
              ) : (
                <ProductForm
                  initialValues={initialValues}
                  submitLabel={state.mode === "edit" ? "Save Changes" : "Create Product"}
                  loading={loading}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
