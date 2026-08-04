import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { normalizePhone } from "@/lib/utils";
import { COURIER_LABELS, CourierValue } from "@/lib/shipping";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

const schema = z.object({
  orderNumber: z.string().min(3),
  phone: z.string().min(6),
});

// Public, unauthenticated order lookup — the only two knobs a caller controls
// are the order number and phone number, and BOTH must match the same order
// before anything about it is returned. Never distinguishes "no such order"
// from "phone didn't match" in the response, so this can't be used to probe
// whether a given order number exists (classic enumeration guard).
export async function POST(req: NextRequest) {
  // 20 lookups per 15 minutes per IP — generous for a genuine customer
  // re-checking a typo'd order number, tight enough to blunt brute-forcing
  // order numbers against a known/guessed phone number.
  const rl = checkRateLimit(`track-order:${getClientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid order number and phone number." }, { status: 400 });

  const NOT_FOUND = NextResponse.json({ error: "No order found matching that order number and phone number." }, { status: 404 });

  const order = await prisma.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber.trim().toUpperCase() },
    include: {
      items: { select: { id: true, name: true, image: true, price: true, quantity: true } },
      shipment: { select: { courier: true, customCourierName: true, trackingNumber: true, deliveryStatus: true, estimatedDelivery: true } },
    },
  });

  // A DRAFT order isn't a real placed order yet (staff-created, not yet
  // confirmed) — it shouldn't be discoverable through the public tracker.
  if (!order || order.status === "DRAFT") return NOT_FOUND;

  if (normalizePhone(order.shippingPhone) !== normalizePhone(parsed.data.phone)) return NOT_FOUND;

  const courierLabel = order.shipment
    ? order.shipment.courier === "CUSTOM"
      ? order.shipment.customCourierName
      : COURIER_LABELS[order.shipment.courier as CourierValue] || order.shipment.courier
    : null;

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({ name: i.name, image: i.image, price: i.price, quantity: i.quantity })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      shipping: {
        name: order.shippingName,
        phone: order.shippingPhone,
        district: order.shippingDistrict,
        area: order.shippingArea,
        street: order.shippingStreet,
        insideDhaka: order.insideDhaka,
      },
      courier: courierLabel,
      trackingNumber: order.shipment?.trackingNumber || null,
      deliveryStatus: order.shipment?.deliveryStatus || null,
      estimatedDelivery: order.shipment?.estimatedDelivery || null,
      estimatedDeliveryEstimate: order.insideDhaka ? "1–3 business days" : "2–5 business days",
    },
  });
}
