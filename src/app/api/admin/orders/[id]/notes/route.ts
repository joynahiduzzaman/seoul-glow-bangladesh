import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { z } from "zod";

const schema = z.object({ message: z.string().min(1).max(2000) });

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// Internal notes are staff-only annotations on an order — they never reach the
// customer, unlike a status change. Stored as a NOTE-type OrderEvent so they show
// up inline in the same timeline as everything else that happened to the order.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  await logOrderEvent(order.id, "NOTE", parsed.data.message, admin.name);

  const events = await prisma.orderEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ events }, { status: 201 });
}
