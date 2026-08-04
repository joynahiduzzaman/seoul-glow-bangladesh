import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { recomputeOrderPaymentStatus } from "@/server/payment-reconciliation";
import { formatBDT } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  verificationStatus: z.enum(["VERIFIED", "REJECTED"]),
  notes: z.string().max(1000).optional(),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// The actual reconciliation act: an admin has cross-checked this payment's
// transactionId/senderNumber against their own bKash/Nagad/bank statement (or,
// for COD/STORE, physically counted the cash) and confirms or rejects it. Only
// this action — not recording the payment — moves Order.paymentStatus, via
// recomputeOrderPaymentStatus summing all VERIFIED rows for the order.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.payment.findUnique({ where: { id: params.paymentId } });
  if (!existing || existing.orderId !== params.id) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const payment = await prisma.payment.update({
    where: { id: existing.id },
    data: {
      verificationStatus: parsed.data.verificationStatus,
      verifiedById: admin.id,
      verifiedAt: new Date(),
      notes: parsed.data.notes !== undefined ? parsed.data.notes || null : existing.notes,
    },
    include: { verifiedBy: { select: { id: true, name: true } } },
  });

  await logOrderEvent(
    params.id,
    "PAYMENT_CHANGE",
    `${formatBDT(existing.amount)} ${existing.method} payment marked ${parsed.data.verificationStatus.toLowerCase()}`,
    admin.name
  );

  const newPaymentStatus = await recomputeOrderPaymentStatus(params.id);

  const [payments, events, order] = await Promise.all([
    prisma.payment.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { id: true, name: true } } } }),
    prisma.orderEvent.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" } }),
    prisma.order.findUnique({ where: { id: params.id }, select: { paymentStatus: true } }),
  ]);

  return NextResponse.json({ payment, payments, events, paymentStatus: order?.paymentStatus ?? newPaymentStatus });
}

// Only an UNVERIFIED row can be deleted — once a payment has been resolved
// (verified or rejected) it's part of the audit trail and stays, matching why
// the whole ledger exists in the first place.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const existing = await prisma.payment.findUnique({ where: { id: params.paymentId } });
  if (!existing || existing.orderId !== params.id) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (existing.verificationStatus !== "UNVERIFIED") {
    return NextResponse.json({ error: "Only unverified payment records can be removed" }, { status: 400 });
  }

  await prisma.payment.delete({ where: { id: existing.id } });
  await logOrderEvent(params.id, "PAYMENT_CHANGE", `Removed a ${formatBDT(existing.amount)} ${existing.method} payment record (recorded in error)`, admin.name);

  const [payments, events] = await Promise.all([
    prisma.payment.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { id: true, name: true } } } }),
    prisma.orderEvent.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ payments, events });
}
