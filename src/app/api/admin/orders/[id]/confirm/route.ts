import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { verifyOrderItems, finalizeOrderEffects, OrderValidationError } from "@/server/orders";
import { logOrderEvent } from "@/server/order-events";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// POST /api/admin/orders/[id]/confirm — turns a DRAFT order into a real PENDING
// one: re-checks stock (strictly this time — a draft is allowed to be short on
// stock, a confirmed order is not), then runs the same finalize step
// (stock decrement, affiliate commission, email, notification) a real checkout
// order gets immediately, via the shared core in src/server/orders.ts.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft orders can be confirmed" }, { status: 400 });
  }

  try {
    // Re-verify with today's stock — it may have moved since the draft was saved.
    const { verifiedItems } = await verifyOrderItems(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      { allowInsufficientStock: false }
    );

    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING" } });
    await finalizeOrderEffects(updated, verifiedItems, order.shippingName);
    await logOrderEvent(order.id, "STATUS_CHANGE", "Draft confirmed — order placed", admin.name);
    revalidatePath("/admin/orders");

    return NextResponse.json({ order: updated });
  } catch (err: any) {
    const isValidationError = err instanceof OrderValidationError;
    return NextResponse.json(
      { error: isValidationError ? err.message : "Failed to confirm order" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
