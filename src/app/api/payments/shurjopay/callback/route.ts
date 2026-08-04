import { NextRequest, NextResponse } from "next/server";
import { verifyShurjopayPayment } from "@/server/payments/shurjopay";
import { markOrderPaid, markOrderPaymentFailed } from "@/server/payments/confirm";

// ShurjoPay redirects here with order_id (our order number) after checkout. We call
// ShurjoPay's "verification" endpoint server-to-server before trusting the redirect.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const orderId = searchParams.get("order_id");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (status === "cancel" || !orderId) {
    if (orderId) await markOrderPaymentFailed(orderId).catch(() => {});
    return NextResponse.redirect(`${siteUrl}/checkout/success?payment_failed=true`);
  }

  try {
    const { verified, amount } = await verifyShurjopayPayment(orderId);
    if (!verified) {
      await markOrderPaymentFailed(orderId);
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
    }
    // ShurjoPay is verified BY our order id, so the lookup is inherently bound to
    // this order — no separate gatewayOrderRef needed. The captured amount still
    // has to match the total.
    const settled = await markOrderPaid(orderId, { amount });
    if (!settled.ok) {
      console.error("ShurjoPay settlement refused:", settled.reason, { orderId });
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
    }
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment=shurjopay`);
  } catch (err) {
    console.error("ShurjoPay verification error:", err);
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
  }
}
