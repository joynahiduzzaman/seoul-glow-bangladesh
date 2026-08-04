import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

// GET /api/products/compare?ids=a,b,c,d — full detail for the comparison table.
// Public/no-auth: this is the same catalog data already shown on any product
// page, just fetched for several products at once.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4); // MAX_COMPARE_ITEMS — enforced again here so a crafted URL can't ask for more

  if (ids.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    include: {
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  // Prisma's `in` filter doesn't preserve the requested order — restore it so the
  // comparison table's column order matches the order products were added in.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is (typeof products)[number] => Boolean(p));

  return NextResponse.json({ products: ordered });
}
