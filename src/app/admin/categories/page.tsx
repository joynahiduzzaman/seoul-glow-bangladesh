import { prisma } from "@/server/db";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <TaxonomyManager
      kind="categories"
      rows={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
        // Serialised here rather than passing a Date: this crosses the
        // server/client boundary, and the manager only ever formats it.
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
