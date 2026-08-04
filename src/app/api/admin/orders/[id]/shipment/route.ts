import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { logOrderEvent } from "@/server/order-events";
import { courierProviders } from "@/server/couriers";
import { COURIERS, COURIER_LABELS, DELIVERY_STATUSES } from "@/lib/shipping";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const assignSchema = z
  .object({
    courier: z.enum(COURIERS),
    customCourierName: z.string().max(60).optional(),
    trackingNumber: z.string().max(80).optional(),
    estimatedDelivery: z.string().optional(),
    shippingNotes: z.string().max(1000).optional(),
  })
  .refine((d) => d.courier !== "CUSTOM" || Boolean(d.customCourierName?.trim()), {
    message: "Enter a name for the custom courier",
    path: ["customCourierName"],
  });

// Creates or updates the order's single shipment record — assigning/reassigning
// a courier, tracking number, ETA and notes in one save (matches the old
// single-button "Save Shipment Info" UX, just against a real Shipment row now
// instead of two loose scalars on Order). If the admin didn't type a tracking
// number and the chosen courier's API is configured, we attempt to fetch one —
// see src/server/couriers for why that's a best-effort, never a hard failure.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { shipment: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let trackingNumber = parsed.data.trackingNumber?.trim() || null;
  const provider = courierProviders[parsed.data.courier];
  if (!trackingNumber && provider?.isConfigured()) {
    const result = await provider.createShipment({
      orderNumber: order.orderNumber,
      recipientName: order.shippingName,
      recipientPhone: order.shippingPhone,
      address: order.shippingStreet,
      district: order.shippingDistrict,
      area: order.shippingArea,
      codAmount: order.paymentMethod === "COD" ? order.total : 0,
    });
    if (result.success && result.trackingNumber) trackingNumber = result.trackingNumber;
  }

  const shipment = await prisma.shipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      courier: parsed.data.courier,
      customCourierName: parsed.data.courier === "CUSTOM" ? parsed.data.customCourierName || null : null,
      trackingNumber,
      estimatedDelivery: parsed.data.estimatedDelivery ? new Date(parsed.data.estimatedDelivery) : null,
      shippingNotes: parsed.data.shippingNotes || null,
      assignedById: admin.id,
    },
    update: {
      courier: parsed.data.courier,
      customCourierName: parsed.data.courier === "CUSTOM" ? parsed.data.customCourierName || null : null,
      trackingNumber,
      estimatedDelivery: parsed.data.estimatedDelivery ? new Date(parsed.data.estimatedDelivery) : null,
      shippingNotes: parsed.data.shippingNotes || null,
      assignedById: admin.id,
    },
    include: { assignedBy: { select: { id: true, name: true } } },
  });

  const courierLabel = parsed.data.courier === "CUSTOM" ? parsed.data.customCourierName : COURIER_LABELS[parsed.data.courier];
  const parts = [`courier: ${courierLabel}`];
  if (trackingNumber) parts.push(`tracking #: ${trackingNumber}`);
  await logOrderEvent(order.id, "TRACKING", `Shipment ${order.shipment ? "updated" : "assigned"} — ${parts.join(", ")}`, admin.name);

  const events = await prisma.orderEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ shipment, events }, { status: order.shipment ? 200 : 201 });
}

const statusSchema = z.object({ deliveryStatus: z.enum(DELIVERY_STATUSES) });

// Quick delivery-status update — separate from the fuller assignment save above
// since a courier's progress (picked up -> in transit -> delivered) typically
// gets updated more often, and independently of who's assigned or what the
// tracking number is.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.shipment.findUnique({ where: { orderId: params.id } });
  if (!existing) return NextResponse.json({ error: "No shipment assigned yet" }, { status: 404 });

  const shipment = await prisma.shipment.update({
    where: { orderId: params.id },
    data: { deliveryStatus: parsed.data.deliveryStatus },
    include: { assignedBy: { select: { id: true, name: true } } },
  });

  if (parsed.data.deliveryStatus !== existing.deliveryStatus) {
    await logOrderEvent(params.id, "TRACKING", `Delivery status changed from ${existing.deliveryStatus} to ${parsed.data.deliveryStatus}`, admin.name);
  }

  const events = await prisma.orderEvent.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ shipment, events });
}
