"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import ProductForm, { EMPTY_PRODUCT_FORM, ProductFormValues } from "@/components/admin/ProductForm";
import { parseJsonArray } from "@/lib/utils";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialValues, setInitialValues] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);

  useEffect(() => {
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.product) {
          toast.error("Product not found");
          router.push("/admin/products");
          return;
        }
        const p = d.product;
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
          // Prisma returns a Date (serialized as an ISO string over JSON) — the
          // <input type="date"> needs just the yyyy-mm-dd portion.
          expiryDate: p.expiryDate ? String(p.expiryDate).slice(0, 10) : "",
        });
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setFetching(false));
  }, [productId, router]);

  async function handleSubmit(form: ProductFormValues) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
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
      toast.success("Product updated");
      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="max-w-2xl text-sm text-ink/70">Loading product…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold mb-8">Edit Product</h1>
      <ProductForm initialValues={initialValues} submitLabel="Save Changes" loading={loading} onSubmit={handleSubmit} />
    </div>
  );
}
