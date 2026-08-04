import { NextRequest, NextResponse } from "next/server";
import { verifyNagadPayment } from "@/server/payments/nagad";
import { markOrderPaid, markOrderPaymentFailed } from "@/server/payments/confirm";

// Nagad redirects here with payment_ref_id + order_id (our order number) + status. As with
// every gateway here, the redirect itself is never sufficient — we call Nagad's "verify
// payment" endpoint server-to-server before trusting it.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const paymentRefId = searchParams.get("payment_ref_id");
  const orderId = searchParams.get("order_id");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (status?.toLowerCase() !== "success" || !paymentRefId || !orderId) {
    return NextResponse.redirect(`${siteUrl}/checkout/success?payment_failed=true`);
  }

  try {
    const { verified, amount, orderRef } = await verifyNagadPayment(paymentRefId);
    if (!verified) {
      await markOrderPaymentFailed(orderId);
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
    }
    // payment_ref_id and order_id arrive as INDEPENDENT query params, so the
    // gateway's own orderRef is what proves they belong together.
    const settled = await markOrderPaid(orderId, { amount, gatewayOrderRef: orderRef, transactionId: paymentRefId });
    if (!settled.ok) {
      console.error("Nagad settlement refused:", settled.reason, { orderId, paymentRefId });
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
    }
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment=nagad`);
  } catch (err) {
    console.error("Nagad verification error:", err);
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${orderId}&payment_failed=true`);
  }
}
