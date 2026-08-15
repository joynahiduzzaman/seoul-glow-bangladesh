import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import slugify from "slugify";
import { z } from "zod";
import { PRODUCT_TEXTURES } from "@/lib/product-texture";
import { revalidateCatalogue } from "@/server/catalogue-cache";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  sku: z.string().min(1).max(40).optional(),
  brandId: z.string(),
  categoryId: z.string(),
  description: z.string().min(5),
  price: z.number().positive(),
  // Supplier cost — optional, admin-only, never returned on storefront routes.
  costPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  stock: z.number().min(0).default(0),
  images: z.array(z.string()).default([]),
  status: z.enum(["ACTIVE", "DRAFT"]).default("ACTIVE"),
  weightGrams: z.number().int().positive().nullable().optional(),
  volumeMl: z.number().int().positive().nullable().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isFlashSale: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  batchNumber: z.string().max(40).nullable().optional(),
  texture: z.enum(PRODUCT_TEXTURES).nullable().optional(),
  // Long-standing Product columns that the admin form never exposed. Arrays are
  // stored as JSON strings to keep the schema database-agnostic, exactly as
  // images and skinType already were.
  benefits: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  howToUse: z.string().max(2000).nullable().optional(),
  ingredients: z.string().max(4000).nullable().optional(),
  skinType: z.array(z.string().max(40)).max(12).optional(),
  skinConcern: z.array(z.string().max(40)).max(12).optional(),
  warnings: z.string().max(1000).nullable().optional(),
  countryOfOrigin: z.string().max(60).optional(),
  // yyyy-mm-dd from <input type="date">; z.coerce.date() turns it into a real Date for Prisma.
  expiryDate: z.coerce.date().nullable().optional(),
});

export async function GET() {
  // This returns the full admin row — costPrice, batchNumber, stock — and every
  // product regardless of status, including unpublished DRAFTs. POST was guarded
  // but GET was not, so the whole catalogue with supplier costs was readable
  // without a session. Storefront callers have /api/products for public fields.
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const products = await prisma.product.findMany({
    include: { brand: { select: { name: true } }, category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { slug: manualSlug, images, ...data } = parsed.data;
  // A manually-entered slug is used as-is (already validated as lowercase/numbers/
  // hyphens above); otherwise auto-generate from the name, same as before.
  const slug = manualSlug || slugify(data.name, { lower: true, strict: true }) + "-" + Date.now().toString().slice(-5);

  if (manualSlug) {
    const clash = await prisma.product.findUnique({ where: { slug: manualSlug } });
    if (clash) return NextResponse.json({ error: "That URL slug is already in use by another product" }, { status: 409 });
  }
  if (data.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (clash) return NextResponse.json({ error: "That SKU is already in use by another product" }, { status: 409 });
  }

  // These three were pinned to "[]" here, so even once the form sent them the
  // values would have been thrown away on the way in. They are JSON string
  // columns, so each is serialised the same way images already is.
  const { benefits, skinType, skinConcern, ...rest } = data;

  const product = await prisma.product.create({
    data: {
      ...rest,
      slug,
      images: JSON.stringify(images),
      skinType: JSON.stringify(skinType ?? []),
      skinConcern: JSON.stringify(skinConcern ?? []),
      benefits: JSON.stringify((benefits ?? []).filter((b) => b.trim())),
    },
  });
  // Nothing here purged any cache, so a new product waited out the 60-second ISR
  // window before the shop showed it — and the header menu, five minutes.
  revalidateCatalogue(product.slug);
  return NextResponse.json({ product }, { status: 201 });
}
