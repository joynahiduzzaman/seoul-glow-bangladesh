import Link from "next/link";
import { prisma } from "@/server/db";
import { getReservedQuantities } from "@/server/inventory";
import StockAdjustButton from "@/components/admin/StockAdjustButton";
import { AlertTriangle, PackageX, PackageCheck, Search, CalendarClock, CalendarX } from "lucide-react";

export const dynamic = "force-dynamic";

// Same 60-day window used by the dashboard's expiry-alert widget and the
// Product Form's live hint — one threshold everywhere a product's freshness is judged.
const EXPIRY_SOON_DAYS = 60;

export default async function InventoryPage({ searchParams }: { searchParams: { q?: string; filter?: string } }) {
  const q = searchParams.q?.trim() || "";
  const filter = searchParams.filter || "all";
  const now = new Date();
  const expirySoonCutoff = new Date(now);
  expirySoonCutoff.setDate(expirySoonCutoff.getDate() + EXPIRY_SOON_DAYS);

  const where: any = {};
  if (q) where.name = { contains: q };
  if (filter === "low") where.stock = { gt: 0, lt: 10 };
  if (filter === "out") where.stock = 0;
  if (filter === "expiring") where.expiryDate = { gte: now, lte: expirySoonCutoff };
  if (filter === "expired") where.expiryDate = { lt: now };

  const [products, lowStockCount, outOfStockCount, expiringSoonCount, expiredCount, recentHistory] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: filter === "expiring" || filter === "expired" ? { expiryDate: "asc" } : { stock: "asc" },
      include: { brand: { select: { name: true } } },
    }),
    prisma.product.count({ where: { stock: { gt: 0, lt: 10 } } }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.product.count({ where: { expiryDate: { gte: now, lte: expirySoonCutoff }, stock: { gt: 0 } } }),
    prisma.product.count({ where: { expiryDate: { lt: now }, stock: { gt: 0 } } }),
    prisma.stockAdjustment.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { product: { select: { name: true } } } }),
  ]);

  const reserved = await getReservedQuantities(products.map((p) => p.id));

  const FILTERS = [
    { key: "all", label: "All Products" },
    { key: "low", label: `Low Stock (${lowStockCount})` },
    { key: "out", label: `Out of Stock (${outOfStockCount})` },
    { key: "expiring", label: `Expiring Soon (${expiringSoonCount})` },
    { key: "expired", label: `Expired (${expiredCount})` },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-1">Inventory</h1>
      <p className="text-sm text-ink/70 mb-6">Current, reserved, and available stock across every product.</p>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="w-full rounded-full border border-ink/10 pl-9 pr-4 py-2.5 text-sm"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/inventory?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`text-xs rounded-full px-4 py-2.5 font-medium transition-colors whitespace-nowrap ${
                filter === f.key ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-beige/60"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4">Product</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Current Stock</th>
              <th className="p-4">Reserved</th>
              <th className="p-4">Available</th>
              <th className="p-4">Status</th>
              <th className="p-4">Expiry</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const reservedQty = reserved.get(p.id) || 0;
              const available = p.stock;
              const current = available + reservedQty;
              return (
                <tr key={p.id} className="border-b border-ink/5">
                  <td className="p-4 font-medium max-w-[220px] truncate">{p.name}</td>
                  <td className="p-4 text-ink/70">{p.brand.name}</td>
                  <td className="p-4">{current}</td>
                  <td className="p-4 text-ink/70">{reservedQty > 0 ? reservedQty : "—"}</td>
                  <td className="p-4 font-medium">{available}</td>
                  <td className="p-4"><StockBadge stock={p.stock} /></td>
                  <td className="p-4"><ExpiryBadge expiryDate={p.expiryDate} /></td>
                  <td className="p-4"><StockAdjustButton productId={p.id} productName={p.name} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-10 text-center text-sm text-ink/70">
            {q ? `No products match "${q}".` : "No products in this view."}
          </p>
        )}
      </div>

      {/* Stock history log */}
      <div className="bg-white rounded-xl2 shadow-soft p-6">
        <h2 className="font-display text-xl mb-1">Recent Stock Activity</h2>
        <p className="text-xs text-ink/70 mb-5">Every stock change, manual or automatic, most recent first.</p>
        {recentHistory.length === 0 ? (
          <p className="text-sm text-ink/70 text-center py-6">No stock changes recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {recentHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-4 border-b border-ink/5 pb-3 last:border-0 last:pb-0 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{h.product.name}</p>
                  <p className="text-xs text-ink/70 truncate">{h.reason}{h.adjustedBy ? ` · by ${h.adjustedBy}` : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-medium ${h.change > 0 ? "text-success" : "text-badge-sale"}`}>
                    {h.change > 0 ? "+" : ""}{h.change}
                  </p>
                  <p className="text-[11px] text-ink/35">{new Date(h.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="flex items-center gap-1 w-fit text-xs bg-badge-sale/10 text-badge-sale rounded-full px-2.5 py-1 font-medium"><PackageX size={11} /> Out of Stock</span>;
  if (stock < 10) return <span className="flex items-center gap-1 w-fit text-xs bg-gold/15 text-gold rounded-full px-2.5 py-1 font-medium"><AlertTriangle size={11} /> Low Stock</span>;
  return <span className="flex items-center gap-1 w-fit text-xs bg-success/10 text-success rounded-full px-2.5 py-1 font-medium"><PackageCheck size={11} /> In Stock</span>;
}

function ExpiryBadge({ expiryDate }: { expiryDate: Date | null }) {
  if (!expiryDate) return <span className="text-xs text-ink/30">—</span>;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  const formatted = new Date(expiryDate).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  if (days < 0) {
    return (
      <span className="flex items-center gap-1 w-fit text-xs bg-badge-sale/10 text-badge-sale rounded-full px-2.5 py-1 font-medium">
        <CalendarX size={11} /> Expired {formatted}
      </span>
    );
  }
  if (days <= EXPIRY_SOON_DAYS) {
    return (
      <span className="flex items-center gap-1 w-fit text-xs bg-gold/15 text-gold rounded-full px-2.5 py-1 font-medium">
        <CalendarClock size={11} /> {formatted} ({days}d)
      </span>
    );
  }
  return <span className="text-xs text-ink/70">{formatted}</span>;
}
