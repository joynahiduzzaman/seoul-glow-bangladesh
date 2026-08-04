import { MetadataRoute } from "next";
import { prisma } from "@/server/db";
import { SITE_URL } from "@/lib/site-url";

// Regenerate at most once an hour rather than hitting the DB on every crawler request.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SITE_URL;
  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/shop`, lastModified: new Date() },
    { url: `${siteUrl}/blog`, lastModified: new Date() },
    ...products.map((p) => ({ url: `${siteUrl}/product/${p.slug}`, lastModified: p.updatedAt })),
    ...brands.map((b) => ({ url: `${siteUrl}/brands/${b.slug}` })),
    ...categories.map((c) => ({ url: `${siteUrl}/shop?category=${c.slug}` })),
  ];
}
