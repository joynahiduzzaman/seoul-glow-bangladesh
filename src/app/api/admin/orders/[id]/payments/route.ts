import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { formatBDT } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/payment";
import { z } from "zod";

const schema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.number().positive(),
  transactionId: z.string().max(100).optional(),
  senderNumber: z.string().max(30).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// Records one payment attempt/collection against an order — the reconciliation
// ledger entry point. New rows always start UNVERIFIED; recording a payment does
// NOT by itself move Order.paymentStatus (see .../payments/[paymentId] for the
// verify/reject action that does, via src/server/payment-reconciliation.ts) —
// the whole point of reconciliation is that a claimed payment isn't trusted
// until an admin cross-checks it.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: parsed.data.method,
      amount: parsed.data.amount,
      transactionId: parsed.data.transactionId || null,
      senderNumber: parsed.data.senderNumber || null,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      notes: parsed.data.notes || null,
    },
  });

  await logOrderEvent(
    order.id,
    "PAYMENT_CHANGE",
    `Recorded a ${formatBDT(parsed.data.amount)} ${parsed.data.method} payment — pending verification`,
    admin.name
  );

  const [payments, events] = await Promise.all([
    prisma.payment.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" }, include: { verifiedBy: { select: { id: true, name: true } } } }),
    prisma.orderEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ payment, payments, events }, { status: 201 });
}
