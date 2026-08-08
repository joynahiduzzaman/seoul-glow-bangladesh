import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Lightweight endpoint that feeds dropdowns (brands/categories) to admin forms.
//
// It used to return nothing but id + name, which was enough for a <select> but
// left the Homepage Builder's brand and category pickers as rows of blank grey
// squares — the one place you're choosing between things you recognise by their
// logo. The logo/image and product count come along now. All of it is already
// public on the storefront.
export async function GET() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      select: { id: true, name: true, logo: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, image: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const withCount = <T extends { _count: { products: number } }>({ _count, ...rest }: T) => ({
    ...rest,
    productCount: _count.products,
  });
  return NextResponse.json({
    brands: brands.map(withCount),
    categories: categories.map(withCount),
  });
}
