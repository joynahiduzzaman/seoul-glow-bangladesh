import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { parseJsonArray } from "@/lib/utils";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const PRODUCT_FLAGS = ["isFeatured", "isBestSeller", "isFlashSale", "isNewArrival", "isTrending"];

/** Feeds the Homepage Builder's live-preview panel real data reflecting the
 * admin's CURRENT (possibly unsaved) settings — same auto/manual resolution
 * rule the live homepage uses in src/app/page.tsx, so what you see in the
 * preview is what will actually render once you save. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const mode = searchParams.get("mode") || "auto";
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit")) || 8));
  const filter = searchParams.get("filter") || "";

  if (type === "products") {
    if (mode === "manual" && ids.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        include: { brand: { select: { name: true, slug: true } } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      return NextResponse.json({ products: ids.map((id) => byId.get(id)).filter(Boolean).slice(0, limit) });
    }
    const where: Record<string, boolean> = PRODUCT_FLAGS.includes(filter) ? { [filter]: true } : {};
    const products = await prisma.product.findMany({
      where: { ...where, status: "ACTIVE" },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { brand: { select: { name: true, slug: true } } },
    });
    return NextResponse.json({ products });
  }

  if (type === "categories") {
    const all = await prisma.category.findMany({ select: { id: true, name: true, slug: true, image: true }, orderBy: { name: "asc" } });
    const categories =
      mode === "manual" && ids.length > 0
        ? ids.map((id) => all.find((c) => c.id === id)).filter(Boolean).slice(0, limit)
        : all.slice(0, limit);
    return NextResponse.json({ categories });
  }

  if (type === "brands") {
    // Mirrors getAllBrands() on the homepage — includes a representative product
    // image so the builder preview looks like the real section, not a fallback.
    const raw = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        products: {
          where: { status: "ACTIVE", images: { not: "[]" } },
          orderBy: [{ isBestSeller: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { images: true },
        },
      },
      orderBy: { name: "asc" },
    });
    const all = raw.map(({ products, ...brand }) => ({
      ...brand,
      image: parseJsonArray(products[0]?.images)[0] ?? null,
    }));
    const brands =
      mode === "manual" && ids.length > 0
        ? ids.map((id) => all.find((b) => b.id === id)).filter(Boolean).slice(0, limit)
        : all.slice(0, limit);
    return NextResponse.json({ brands });
  }

  if (type === "reviews") {
    const reviews = await prisma.review.findMany({
      where: { rating: { gte: 4 } },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    });
    return NextResponse.json({ reviews });
  }

  return NextResponse.json({ error: "Unknown preview type" }, { status: 400 });
}
