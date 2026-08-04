import { prisma } from "@/server/db";
import { logOrderEvent } from "@/server/order-events";
import { formatBDT } from "@/lib/utils";

/** Currency rounding slack. Gateways return amounts as strings ("1220.00",
 * sometimes "1220.0") and BDT has no sub-taka settlement in practice, so a
 * sub-taka tolerance absorbs formatting without letting a genuinely short
 * payment through. */
const AMOUNT_TOLERANCE_BDT = 0.5;

export interface SettlementProof {
  /** Amount the GATEWAY reports it actually captured. Required — see below. */
  amount: string | number | undefined;
  /** The order reference the GATEWAY itself returned, where the provider gives
   * one. Proves the verified transaction belongs to the order being settled. */
  gatewayOrderRef?: string | null;
  /** Gateway transaction id, recorded on the reconciliation ledger row. */
  transactionId?: string | null;
}

export type SettlementResult =
  | { ok: true; orderNumber: string }
  | { ok: false; reason: "not_found" | "amount_mismatch" | "order_mismatch" | "no_amount" };

/**
 * Single source of truth for "mark this order paid" — callable only with proof
 * from a provider's server-to-server verification, never from a bare redirect.
 *
 * SECURITY (hardened): this previously took only an order number, which left two
 * classes of fraud open, because the callbacks passed an order number straight
 * from the query string:
 *
 *  1. UNBOUND SETTLEMENT. The Nagad and SSLCommerz callbacks verified one
 *     reference (payment_ref_id / val_id) and then settled a DIFFERENT order
 *     named separately in the URL. Someone could pay ৳1 for their own order,
 *     take the resulting valid reference, and replay it against any other order
 *     number to mark it paid.
 *  2. AMOUNT TAMPERING. Every provider's verify call already returned the
 *     captured amount and every callback discarded it, so a short capture still
 *     settled the order at its full total.
 *
 * Both are refused here rather than in each callback, so a future provider can't
 * reintroduce them by forgetting a check. Callers must pass the gateway's own
 * amount, and its own order reference wherever the provider returns one.
 */
export async function markOrderPaid(orderNumber: string, proof: SettlementProof): Promise<SettlementResult> {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return { ok: false, reason: "not_found" };

  // The gateway must agree on WHICH order it verified, whenever it tells us.
  if (proof.gatewayOrderRef != null && proof.gatewayOrderRef !== orderNumber) {
    await logOrderEvent(
      order.id,
      "PAYMENT_CHANGE",
      `Settlement REFUSED: gateway verified order "${proof.gatewayOrderRef}" but the callback tried to settle "${orderNumber}"`,
      "System"
    );
    return { ok: false, reason: "order_mismatch" };
  }

  const paid = typeof proof.amount === "string" ? Number(proof.amount) : proof.amount;
  if (paid == null || !Number.isFinite(paid)) {
    await logOrderEvent(order.id, "PAYMENT_CHANGE", "Settlement REFUSED: gateway returned no usable amount", "System");
    return { ok: false, reason: "no_amount" };
  }
  if (paid + AMOUNT_TOLERANCE_BDT < order.total) {
    await logOrderEvent(
      order.id,
      "PAYMENT_CHANGE",
      `Settlement REFUSED: gateway captured ${formatBDT(paid)} but the order total is ${formatBDT(order.total)}`,
      "System"
    );
    return { ok: false, reason: "amount_mismatch" };
  }

  // Idempotent: a replayed or duplicated callback must not double-post the ledger.
  if (order.paymentStatus === "PAID") return { ok: true, orderNumber };

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });

  const transactionId = proof.transactionId ?? order.gatewayTransactionId;
  const alreadyLogged = await prisma.payment.findFirst({
    where: { orderId: order.id, verificationStatus: "VERIFIED", transactionId: transactionId ?? undefined },
  });
  if (!alreadyLogged) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: order.paymentMethod,
        // The captured amount, not the order total — if they ever diverge the
        // ledger must show what actually arrived.
        amount: paid,
        transactionId,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        paidAt: new Date(),
        notes: "Auto-verified via payment gateway callback",
      },
    });
    await logOrderEvent(
      order.id,
      "PAYMENT_CHANGE",
      `Payment of ${formatBDT(paid)} confirmed via ${order.paymentMethod} gateway`,
      "System"
    );
  }

  return { ok: true, orderNumber };
}

export async function markOrderPaymentFailed(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return null;
  // Never downgrade an already-settled order because a stray failure/cancel
  // redirect arrived late — that would let anyone un-pay a real order.
  if (order.paymentStatus === "PAID") return order;
  return prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "FAILED" },
  });
}
