import { prisma } from "./db";
import { STOCK_RESTORE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { logOrderEvent } from "./order-events";

/**
 * Keeps affiliate commissions in step with an order's fate.
 *
 * A commission is written the moment an order is placed, but nothing ever
 * reversed it. Cancel the order and the payout obligation survived forever —
 * the same defect the revenue totals had, one table over, and worse: revenue was
 * only displayed wrongly, whereas this is money owed to a real person.
 *
 * Commission.orderId is a plain column rather than a relation, so this cannot be
 * expressed as a query filter the way revenueWhere is. It has to be maintained
 * on the status transition, mirroring how stock is restored in the same handler.
 *
 * Deliberately symmetrical with STOCK_RESTORE_STATUSES: entering CANCELLED or
 * RETURNED voids, and the reactivation back out of them restores — because the
 * order is live again and the referrer should be credited again.
 */

const VOID = "VOID";
const PENDING = "PENDING";
const PAID = "PAID";

export async function syncCommissionsForOrderStatus(
  orderId: string,
  from: string,
  to: string,
  actor: string
): Promise<void> {
  const wasVoided = STOCK_RESTORE_STATUSES.includes(from as OrderStatus);
  const nowVoided = STOCK_RESTORE_STATUSES.includes(to as OrderStatus);
  if (wasVoided === nowVoided) return;

  const commissions = await prisma.commission.findMany({ where: { orderId } });
  if (commissions.length === 0) return;

  if (nowVoided) {
    // Already-paid commissions are left alone on purpose: that money has left
    // the business, and silently marking it void would hide a real loss rather
    // than record it. Flag it for a human instead.
    const paid = commissions.filter((c) => c.status === PAID);
    const voidable = commissions.filter((c) => c.status === PENDING);

    if (voidable.length) {
      await prisma.commission.updateMany({
        where: { orderId, status: PENDING },
        data: { status: VOID },
      });
      const amount = voidable.reduce((sum, c) => sum + c.amount, 0);
      await logOrderEvent(orderId, "NOTE", `Affiliate commission voided (${amount}) — order ${to.toLowerCase()}`, actor);
    }

    if (paid.length) {
      const amount = paid.reduce((sum, c) => sum + c.amount, 0);
      console.warn(`[commissions] order ${orderId} ${to} but ${amount} already paid out to an affiliate`);
      await logOrderEvent(
        orderId,
        "NOTE",
        `WARNING: ${amount} of affiliate commission was already PAID before this order was ${to.toLowerCase()}. Recover it manually.`,
        actor
      );
    }
    return;
  }

  // Leaving CANCELLED/RETURNED — the order is live again, so credit it again.
  const restored = await prisma.commission.updateMany({
    where: { orderId, status: VOID },
    data: { status: PENDING },
  });
  if (restored.count > 0) {
    await logOrderEvent(orderId, "NOTE", `Affiliate commission reinstated — order reactivated to ${to}`, actor);
  }
}

/** Commissions that represent a real obligation: voided ones are excluded. */
export const payableCommissionWhere = { status: { not: VOID } } as const;
