import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { shippingFeeFor } from "@/lib/utils";
import { getDistrictByName, isDhakaZone } from "@/lib/shipping-zones";
import { paymentProviders } from "@/server/payments";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { verifyOrderItems, resolveCoupon, incrementCouponUsage, createOrderRecord, finalizeOrderEffects, OrderValidationError } from "@/server/orders";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

const itemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  image: z.string().optional(),
  price: z.number(),
  quantity: z.number().min(1),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1, "Your cart is empty"),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "SHURJOPAY", "CARD"]),
  shipping: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    district: z.string().min(2),
    area: z.string().min(2),
    street: z.string().min(2),
    insideDhaka: z.boolean(),
    label: z.string().optional(),
  }),
  guestEmail: emailSchema.optional(),
  giftNote: z.string().optional(),
});

// POST /api/orders — creates the order, applies any coupon, calculates shipping,
// and (for non-COD methods) kicks off the payment-gateway redirect flow. The
// pricing/stock/order-record/stock-decrement/affiliate/email core is shared with
// the admin's manual order form (src/server/orders.ts) — everything below this
// point that ISN'T shared is specific to a real customer checkout: rate limiting,
// the payment gateway redirect, and marking any abandoned-cart session recovered.
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(`orders:${getClientIp(req)}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many orders placed — please wait a few minutes and try again." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { items, couponCode, paymentMethod, shipping, guestEmail, giftNote } = parsed.data;
    const user = await getCurrentUser();

    const { verifiedItems, subtotal } = await verifyOrderItems(items);
    const { discount, couponCode: appliedCouponCode } = await resolveCoupon(couponCode, subtotal);

    // SECURITY: derive the delivery zone from the district NAME rather than
    // trusting the client's `insideDhaka` flag. The flag arrives in the request
    // body, so a crafted order could pair an outside-Dhaka district with
    // `insideDhaka: true` and pay the ৳70 inside-Dhaka rate instead of ৳130.
    // Line prices and coupons are already recomputed server-side; the shipping
    // fee was the one money field still taken on trust.
    // An unrecognised district falls back to the outside-Dhaka rate — the safe
    // direction to be wrong in.
    const matchedDistrict = getDistrictByName(shipping.district);
    const insideDhaka = matchedDistrict ? isDhakaZone(matchedDistrict.id) : false;
    const shippingFee = shippingFeeFor(insideDhaka);

    const order = await createOrderRecord({
      verifiedItems,
      subtotal,
      discount,
      shippingFee,
      couponCode: appliedCouponCode,
      paymentMethod,
      shipping: { ...shipping, insideDhaka },
      userId: user?.id,
      guestEmail,
      guestName: shipping.name,
      guestPhone: shipping.phone,
      giftNote,
      status: "PENDING",
      source: "ONLINE",
    });

    if (appliedCouponCode) {
      await incrementCouponUsage(appliedCouponCode);
    }

    // If this order completes a previously-tracked checkout session, mark it recovered
    // so the abandoned-cart cron stops emailing about it.
    const recipientEmail = user?.email || guestEmail;
    if (recipientEmail) {
      await prisma.cartSession.updateMany({
        where: { email: recipientEmail, recovered: false },
        data: { recovered: true },
      });
    }

    // The only caller that alerts the store: this is a customer placing an
    // order, which is the thing the team needs to be told about. The admin's own
    // manual-order and confirm-draft actions deliberately stay silent.
    await finalizeOrderEffects(order, verifiedItems, shipping.name, { notifyStore: true });

    // Cash on Delivery needs no gateway redirect — order confirmed immediately.
    if (paymentMethod === "COD") {
      return NextResponse.json({ order, redirectUrl: `/checkout/success?order=${order.orderNumber}` });
    }

    // Non-COD: hand off to the relevant gateway's sandbox/production API.
    const provider = paymentProviders[paymentMethod];
    if (!provider || !provider.isConfigured()) {
      return NextResponse.json({
        order,
        warning: `${provider?.name || paymentMethod} is not configured with merchant credentials yet — add them to .env to enable live payments. Order was created with pending payment status.`,
        redirectUrl: `/checkout/success?order=${order.orderNumber}&pending=true`,
      });
    }

    const callbackBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const result = await provider.initPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      customerName: shipping.name,
      customerPhone: shipping.phone,
      customerEmail: guestEmail,
      callbackBaseUrl,
    });

    if (!result.success) {
      return NextResponse.json({ order, error: result.error, redirectUrl: `/checkout/success?order=${order.orderNumber}&payment_failed=true` });
    }

    // Store the gateway's transaction/payment reference so the callback route can look the
    // order back up (bKash's redirect, for example, only includes its own paymentID, not our order number).
    if (result.transactionId) {
      await prisma.order.update({ where: { id: order.id }, data: { gatewayTransactionId: result.transactionId } });
    }

    return NextResponse.json({ order, redirectUrl: result.redirectUrl });
  } catch (err: any) {
    console.error("Order creation error:", err);
    const isValidationError = err instanceof OrderValidationError;
    return NextResponse.json(
      { error: isValidationError ? err.message : "Something went wrong placing your order. Please try again." },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// GET /api/orders — list current user's orders (customer dashboard)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const orders = await prisma.order.findMany({
    // Excludes DRAFT — a staff-created draft isn't "this customer's order" until
    // it's actually confirmed.
    where: { userId: user.id, status: { not: "DRAFT" } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
