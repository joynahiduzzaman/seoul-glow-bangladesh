import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { isFuzzyMatch } from "@/lib/fuzzy-search";

// GET /api/products?category=&brand=&skinType=&minPrice=&maxPrice=&sort=&q=&filter=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const brand = searchParams.get("brand");
  const q = searchParams.get("q");
  const filter = searchParams.get("filter");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort");
  // Used by the search overlay's live-suggestion dropdown to keep the query cheap —
  // the shop page's full listing leaves this unset and gets everything as before.
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  const where: any = { status: "ACTIVE" };
  if (category) where.category = { slug: category };
  if (brand) where.brand = { slug: brand };
  // Matches product name, brand name, Korean name, and category — the search box
  // promises "products, brands, or concerns", so "COSRX" or "sunscreen" both work.
  //
  // `mode: "insensitive"` is load-bearing on PostgreSQL. Prisma compiles
  // `contains` to SQL LIKE, which SQLite evaluates case-insensitively for ASCII
  // but PostgreSQL does not — so after the move to Neon, "snail" matched nothing
  // while "Snail" matched, and every lowercase search (i.e. how people actually
  // type) silently returned an empty catalogue. This forces ILIKE.
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { koreanName: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }
  if (filter === "bestseller") where.isBestSeller = true;
  if (filter === "new") where.isNewArrival = true;
  if (filter === "flashsale") where.isFlashSale = true;
  if (filter === "trending") where.isTrending = true;
  if (filter === "featured") where.isFeatured = true;

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { price: "asc" };
  if (sort === "price_desc") orderBy = { price: "desc" };
  if (sort === "newest") orderBy = { createdAt: "desc" };

  const include = {
    brand: { select: { name: true, slug: true } },
    category: { select: { name: true, slug: true } },
    reviews: { select: { rating: true } },
  } as const;

  let products = await prisma.product.findMany({ where, orderBy, take: limit, include });

  // Typo-tolerance fallback: `contains` is still an exact substring match, so
  // "sunscren" or "seurm" would otherwise come back empty. Only kicks in for the
  // suggestion dropdown (limit set) and only once exact matching came up short —
  // most searches never reach this, so the extra query is rare, not per-keystroke.
  if (q && limit && products.length < limit) {
    const exactIds = new Set(products.map((p) => p.id));
    const candidates = await prisma.product.findMany({
      where: { status: "ACTIVE", ...(category ? { category: { slug: category } } : {}), ...(brand ? { brand: { slug: brand } } : {}) },
      take: 500,
      include,
    });
    const fuzzyMatches = candidates.filter(
      (p) =>
        !exactIds.has(p.id) &&
        (isFuzzyMatch(q, p.name) || isFuzzyMatch(q, p.brand.name) || isFuzzyMatch(q, p.category.name) || (p.koreanName ? isFuzzyMatch(q, p.koreanName) : false))
    );
    products = [...products, ...fuzzyMatches].slice(0, limit);
  }

  // Same avgRating/reviewCount pattern already used on the homepage (see src/app/page.tsx)
  // — computed here instead of stored, since review counts are low enough that this is cheap.
  const withRatings = products.map(({ reviews, ...p }) => ({
    ...p,
    avgRating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
    reviewCount: reviews.length,
  }));

  return NextResponse.json({ products: withRatings });
}
