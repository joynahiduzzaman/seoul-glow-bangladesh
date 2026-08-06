import { prisma } from "@/server/db";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <TaxonomyManager
      kind="brands"
      rows={brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        // The manager shows one image; for a brand that is its logo.
        image: b.logo,
        productCount: b._count.products,
      }))}
    />
  );
}
