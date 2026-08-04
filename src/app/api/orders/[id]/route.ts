import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

/**
 * SECURITY (fixed): this route previously took an order id *or* order number
 * and returned the full order — including the customer's name, phone, email and
 * delivery address — with no authentication and no ownership check.
 *
 * Order numbers are guessable (`SGB{YYMMDD}-{4 digits}`), so that allowed
 * enumerating ~10k ids per day and harvesting customer PII. It is a textbook
 * IDOR, and nothing in the app was calling it.
 *
 * It now requires a session and returns an order only to the person who placed
 * it, or to staff. Guests who need to see an order use POST /api/orders/track,
 * which additionally requires the phone number on the order — keep that as the
 * only guest-accessible path, and never relax this one to match it.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: params.id }, { orderNumber: params.id }] },
    include: { items: true },
  });

  // Same 404 for "doesn't exist" and "not yours": a 403 here would confirm that
  // a guessed order number is real, which is half of what the enumeration
  // attack above needed.
  const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
  if (!order || (!isStaff && order.userId !== user.id)) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
