import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";
import { PRODUCT_TEXTURES } from "@/lib/product-texture";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// Explicit whitelist of editable fields — never spread an untyped request body straight
// into Prisma's `data`, since that would let a caller set arbitrary columns (including
// relation IDs) beyond what the admin UI actually exposes.
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  sku: z.string().min(1).max(40).nullable().optional(),
  description: z.string().min(5).optional(),
  price: z.number().positive().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  stock: z.number().min(0).optional(),
  images: z.array(z.string()).optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT"]).optional(),
  weightGrams: z.number().int().positive().nullable().optional(),
  volumeMl: z.number().int().positive().nullable().optional(),
  metaTitle: z.string().max(70).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isFlashSale: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  batchNumber: z.string().max(40).nullable().optional(),
  texture: z.enum(PRODUCT_TEXTURES).nullable().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.images) data.images = JSON.stringify(data.images);

  if (data.slug) {
    const clash = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id: params.id } } });
    if (clash) return NextResponse.json({ error: "That URL slug is already in use by another product" }, { status: 409 });
  }
  if (data.sku) {
    const clash = await prisma.product.findFirst({ where: { sku: data.sku, NOT: { id: params.id } } });
    if (clash) return NextResponse.json({ error: "That SKU is already in use by another product" }, { status: 409 });
  }

  const product = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const orderItemCount = await prisma.orderItem.count({ where: { productId: params.id } });
  // A product that's appeared in a real order can't be deleted — it would orphan
  // that order's line items. Set it to Draft instead to hide it from the storefront
  // while keeping order history intact.
  if (orderItemCount > 0) {
    return NextResponse.json(
      { error: "This product has order history and can't be deleted. Set it to Draft instead to hide it from the shop." },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
