import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const original = await prisma.product.findUnique({ where: { id: params.id } });
  if (!original) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // New product needs its own unique slug and SKU (if the original had one) — copy
  // everything else as-is, including images. Starts as Draft and with stats/flags
  // reset so it doesn't immediately show up as a "best seller" duplicate of itself.
  const { id, slug, sku, isBestSeller, isNewArrival, isFlashSale, isTrending, isFeatured, createdAt, updatedAt, ...rest } = original;

  const duplicate = await prisma.product.create({
    data: {
      ...rest,
      name: `${original.name} (Copy)`,
      slug: `${slug}-copy-${Date.now().toString().slice(-5)}`,
      sku: sku ? `${sku}-COPY` : null,
      status: "DRAFT",
      isBestSeller: false,
      isNewArrival: false,
      isFlashSale: false,
      isTrending: false,
      isFeatured: false,
    },
  });

  return NextResponse.json({ product: duplicate }, { status: 201 });
}
