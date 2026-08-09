import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";
import { parseJsonArray } from "@/lib/utils";

/**
 * Photography for the two mega-menu panels in the header.
 *
 * Both were hardcoded stock images. A shop that has uploaded its own catalogue
 * should be showing that instead — the Brands panel leads with a product from a
 * brand it actually stocks, the Skincare panel with one from a stocked
 * category. Two different products where possible, so the menu doesn't show the
 * same photo twice.
 *
 * Returns nulls for an empty catalogue; the header keeps its shipped fallback
 * for that case rather than rendering a hole in the panel.
 */
export const getMenuImages = unstable_cache(
  async (): Promise<{ brands: string | null; categories: string | null }> => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", images: { not: "[]" } },
      orderBy: [{ isBestSeller: "desc" }, { isFeatured: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { images: true },
    });
    const photos = products
      .map((p) => parseJsonArray(p.images)[0])
      .filter((url): url is string => Boolean(url));
    return {
      brands: photos[0] ?? null,
      categories: photos[1] ?? photos[0] ?? null,
    };
  },
  ["header-menu-images"],
  { revalidate: 300 }
);
