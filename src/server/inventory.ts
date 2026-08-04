import { prisma } from "./db";
import { RESERVED_STATUSES } from "@/lib/order-status";

/**
 * The single place that changes a product's stock and logs why. Used by manual
 * admin adjustments, automatic decrements when an order is placed, and automatic
 * restoration when an order is cancelled/refunded — so the Stock History log is a
 * complete, honest record instead of only capturing manual changes.
 *
 * Stock is clamped at 0 — a manual adjustment or a restoration can never push a
 * product negative, even if the numbers passed in would imply it should.
 */
export async function adjustStock(
  productId: string,
  change: number,
  reason: string,
  adjustedBy?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!product) return null;

    const newStock = Math.max(0, product.stock + change);
    const actualChange = newStock - product.stock;
    if (actualChange === 0) return product.stock;

    await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
    await tx.stockAdjustment.create({
      data: { productId, change: actualChange, previousStock: product.stock, newStock, reason, adjustedBy: adjustedBy || null },
    });

    return newStock;
  });
}

/** Reserved = quantity sitting in orders that are accepted but not yet shipped —
 * see RESERVED_STATUSES in src/lib/order-status.ts (currently PENDING/CONFIRMED/
 * PACKED). Once an order is SHIPPED, DELIVERED, CANCELLED, RETURNED, or REFUNDED
 * it's no longer "in flight" so it drops out of this count. DRAFT orders were
 * never decremented in the first place, so they don't reserve anything either.
 * This is computed live from existing Order/OrderItem data — no new field to
 * keep in sync. */
export async function getReservedQuantities(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, order: { status: { in: RESERVED_STATUSES } } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity || 0]));
}
