"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProductForm, { EMPTY_PRODUCT_FORM, ProductFormValues } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(form: ProductFormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product created");
      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold mb-8">Add New Product</h1>
      <ProductForm initialValues={EMPTY_PRODUCT_FORM} submitLabel="Create Product" loading={loading} onSubmit={handleSubmit} />
    </div>
  );
}
