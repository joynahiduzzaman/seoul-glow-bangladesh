import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/server/db";
import { Package, CheckCircle2, FileEdit, PackageX, AlertTriangle, Plus } from "lucide-react";
import ProductsTableClient from "@/components/admin/ProductsTableClient";
import SortSelect from "@/components/admin/SortSelect";
import StatCard from "@/components/admin/StatCard";
import AdminSearchInput from "@/components/admin/AdminSearchInput";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "inStock", label: "In Stock" },
  { key: "outOfStock", label: "Out of Stock" },
  { key: "lowStock", label: "Low Stock" },
];

const SORTS: Record<string, any> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { name: "asc" },
  price: { price: "asc" },
  stock: { stock: "asc" },
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string; brand?: string; category?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const filter = searchParams.filter || "all";
  const brandFilter = searchParams.brand || "";
  const categoryFilter = searchParams.category || "";
  const sort = searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "newest";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }];
  if (filter === "active") where.status = "ACTIVE";
  if (filter === "draft") where.status = "DRAFT";
  if (filter === "inStock") where.stock = { gte: 10 };
  if (filter === "outOfStock") where.stock = 0;
  if (filter === "lowStock") where.stock = { gt: 0, lt: 10 };
  if (brandFilter) where.brandId = brandFilter;
  if (categoryFilter) where.categoryId = categoryFilter;

  const [
    products,
    totalCount,
    totalProducts,
    activeCount,
    draftCount,
    outOfStockCount,
    lowStockCount,
    brands,
    categories,
  ] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { brand: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.product.count({ where: { stock: { gt: 0, lt: 10 } } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const STATS = [
    { icon: Package, label: "Total Products", value: totalProducts, tone: "default" as const, filterKey: "all" },
    { icon: CheckCircle2, label: "Active", value: activeCount, tone: "success" as const, filterKey: "active" },
    { icon: FileEdit, label: "Draft", value: draftCount, tone: "info" as const, filterKey: "draft" },
    { icon: PackageX, label: "Out of Stock", value: outOfStockCount, tone: "danger" as const, filterKey: "outOfStock" },
    { icon: AlertTriangle, label: "Low Stock", value: lowStockCount, tone: "warning" as const, filterKey: "lowStock" },
  ];

  // Preserves whichever filters are already active when a Link changes just one
  // of them (e.g. clicking a status tab keeps the current brand/category/sort).
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, filter, brand: brandFilter, category: categoryFilter, sort, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "filter" && v === "all") && !(k === "sort" && v === "newest")) params.set(k, v);
    });
    return `/admin/products?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold tracking-tight leading-tight">Products</h1>
          <p className="mt-1 text-sm text-ink/70">Manage your catalogue, pricing and stock.</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary !h-11 !px-5 !text-[13px]">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Overview cards — click-through to the matching filtered view */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STATS.map(({ icon, label, value, tone, filterKey }) => (
          <StatCard
            key={label}
            icon={icon}
            label={label}
            value={value}
            tone={tone}
            href={buildQuery({ filter: filterKey === "all" ? undefined : filterKey })}
          />
        ))}
      </div>

      {/* Search */}
      <form className="mb-4 max-w-md">
        <AdminSearchInput defaultValue={q} placeholder="Search by product name or SKU…" />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        {brandFilter && <input type="hidden" name="brand" value={brandFilter} />}
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
      </form>

      {/* Filters + brand/category + sort */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={buildQuery({ filter: f.key === "all" ? undefined : f.key })}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200 ease-silk ${
                filter === f.key
                  ? "bg-ink text-white shadow-e2"
                  : "border border-border-soft bg-white text-ink/70 hover:border-ink/20 hover:text-ink hover:shadow-e1"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 lg:ml-auto flex-wrap">
          <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white w-28 h-9" />}>
            <SortSelect paramName="brand" options={[{ value: "", label: "All Brands" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} />
          </Suspense>
          <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white w-28 h-9" />}>
            <SortSelect paramName="category" options={[{ value: "", label: "All Categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          </Suspense>
          <Suspense fallback={<div className="rounded-full border border-ink/10 px-4 py-2.5 text-xs bg-white w-24 h-9" />}>
            <SortSelect
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "name", label: "Name" },
                { value: "price", label: "Price" },
                { value: "stock", label: "Stock" },
              ]}
            />
          </Suspense>
        </div>
      </div>

      <ProductsTableClient products={products as any} brands={brands} categories={categories} />

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 text-sm text-ink/70">
        <p>
          Showing {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} products
        </p>
        <div className="flex gap-2">
          <Link
            href={buildQuery({ page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={`rounded-full px-4 py-2 text-xs font-medium ${page <= 1 ? "bg-beige/60 text-ink/30 pointer-events-none" : "bg-white hover:bg-beige/60"}`}
          >
            Previous
          </Link>
          <Link
            href={buildQuery({ page: String(page + 1) })}
            aria-disabled={page >= totalPages}
            className={`rounded-full px-4 py-2 text-xs font-medium ${page >= totalPages ? "bg-beige/60 text-ink/30 pointer-events-none" : "bg-white hover:bg-beige/60"}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
