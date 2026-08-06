import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { shippingFeeFor, formatBDT } from "@/lib/utils";
import { ORDER_SOURCES, PAYMENT_STATUSES } from "@/lib/order-status";
import { PAYMENT_METHODS } from "@/lib/payment";
import { verifyOrderItems, resolveCoupon, incrementCouponUsage, createOrderRecord, finalizeOrderEffects, OrderValidationError } from "@/server/orders";
import { logOrderEvent } from "@/server/order-events";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const schema = z
  .object({
    items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1, "Add at least one product"),
    userId: z.string().optional(), // existing customer — omit for guest/new
    shipping: z.object({
      name: z.string().min(2),
      phone: z.string().min(6),
      district: z.string().min(2),
      area: z.string().min(2),
      street: z.string().min(2),
      insideDhaka: z.boolean(),
      label: z.string().optional(),
    }),
    guestEmail: emailSchema.optional().or(z.literal("")),
    giftNote: z.string().optional(),
    couponCode: z.string().optional(),
    manualDiscount: z.number().min(0).optional(),
    shippingFeeOverride: z.number().min(0).nullable().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    source: z.enum(ORDER_SOURCES.filter((s) => s !== "ONLINE") as [string, ...string[]]),
    saveAsDraft: z.boolean().default(false),
  })
  // Manual orders always need a way to identify who's receiving it — either a
  // linked account or, for guests, at least an email/phone to reach them (phone
  // is already required on `shipping`, so this only guards the "no customer
  // link at all and somehow no way to contact them" edge case).
  .refine((d) => Boolean(d.userId) || Boolean(d.shipping.phone), { message: "A customer or shipping phone number is required" });

// POST /api/admin/orders — records a manual order (phone/Messenger/walk-in) taken
// by a staff member. Shares all pricing/stock/order-creation logic with the real
// checkout via src/server/orders.ts — see that file's header comment for why.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  try {
    let customer = null;
    if (d.userId) {
      customer = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true, email: true } });
      if (!customer) return NextResponse.json({ error: "Selected customer not found" }, { status: 404 });
    }

    const isDraft = d.saveAsDraft;
    const { verifiedItems, subtotal, stockWarnings } = await verifyOrderItems(d.items, { allowInsufficientStock: isDraft });
    const { discount: couponDiscount, couponCode: appliedCouponCode } = await resolveCoupon(d.couponCode, subtotal);
    const manualDiscount = d.manualDiscount || 0;
    const shippingFee = d.shippingFeeOverride ?? shippingFeeFor(d.shipping.insideDhaka);
    // Combined discount can never exceed what there is to discount — clamped so a
    // generous manual discount plus a stacked coupon can't push the total negative.
    const discount = Math.min(couponDiscount + manualDiscount, subtotal + shippingFee);

    const order = await createOrderRecord({
      verifiedItems,
      subtotal,
      discount,
      shippingFee,
      couponCode: appliedCouponCode,
      paymentMethod: d.paymentMethod,
      paymentStatus: d.paymentStatus,
      shipping: d.shipping,
      userId: customer?.id,
      guestEmail: d.guestEmail || undefined,
      guestName: d.shipping.name,
      guestPhone: d.shipping.phone,
      giftNote: d.giftNote,
      status: isDraft ? "DRAFT" : "PENDING",
      source: d.source,
      createdByStaffId: admin.id,
    });

    if (appliedCouponCode) await incrementCouponUsage(appliedCouponCode);

    if (isDraft) {
      await logOrderEvent(order.id, "STATUS_CHANGE", `Draft order created (${d.source.toLowerCase()})`, admin.name);
      if (stockWarnings.length > 0) {
        await logOrderEvent(order.id, "NOTE", `Stock shortfall at draft creation — ${stockWarnings.join("; ")}`, "System");
      }
    } else {
      await finalizeOrderEffects(order, verifiedItems, d.shipping.name);
      await logOrderEvent(order.id, "STATUS_CHANGE", `Order created manually (${d.source.toLowerCase()})`, admin.name);

      // A walk-in/phone sale can be paid in full right at creation (e.g. cash
      // handed over in-store) — when the admin sets paymentStatus straight to
      // PAID, record a matching VERIFIED ledger row immediately so the
      // Payments tab isn't empty for an order the system already considers
      // paid. The admin who took the order is the one vouching for it, same
      // as verifying any other payment.
      if (d.paymentStatus === "PAID") {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            method: d.paymentMethod,
            amount: order.total,
            verificationStatus: "VERIFIED",
            verifiedById: admin.id,
            verifiedAt: new Date(),
            notes: "Recorded paid at order creation",
          },
        });
        await logOrderEvent(order.id, "PAYMENT_CHANGE", `Payment of ${formatBDT(order.total)} confirmed at order creation`, admin.name);
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    const isValidationError = err instanceof OrderValidationError;
    if (!isValidationError) console.error("Manual order creation error:", err);
    return NextResponse.json(
      { error: isValidationError ? err.message : "Something went wrong creating the order." },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
