import { prisma } from "./db";

// Recomputes Order.paymentStatus from the sum of that order's VERIFIED Payment
// rows — the single place both the payments POST (record) and PATCH (verify/
// reject) routes call after touching a Payment, so the order-level summary
// field never drifts out of sync with the underlying ledger. FAILED/REFUNDED
// are left alone unless a verified payment now actually covers the order
// (money arriving is real news even if something was previously marked failed).
export async function recomputeOrderPaymentStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, paymentStatus: true } });
  if (!order) return null;

  const verified = await prisma.payment.aggregate({
    where: { orderId, verificationStatus: "VERIFIED" },
    _sum: { amount: true },
  });
  const paid = verified._sum.amount || 0;

  let next: string;
  if (paid <= 0) {
    next = order.paymentStatus === "REFUNDED" || order.paymentStatus === "FAILED" ? order.paymentStatus : "PENDING";
  } else if (paid >= order.total) {
    next = "PAID";
  } else {
    next = "PARTIAL";
  }

  if (next !== order.paymentStatus) {
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: next } });
  }
  return next;
}
