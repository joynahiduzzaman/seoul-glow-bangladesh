import { NextRequest, NextResponse } from "next/server";
import { validateSslcommerzPayment } from "@/server/payments/sslcommerz";
import { markOrderPaid, markOrderPaymentFailed } from "@/server/payments/confirm";

// SSLCommerz posts (or redirects) to success_url / fail_url / cancel_url with tran_id + val_id.
// We call SSLCommerz's "Order Validation API" server-to-server with val_id before trusting
// this and marking the order paid — the redirect alone can be replayed or hit directly.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  return handle(req, form.get("tran_id")?.toString(), form.get("val_id")?.toString());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return handle(req, searchParams.get("tran_id") || undefined, searchParams.get("val_id") || undefined);
}

async function handle(req: NextRequest, tranId?: string, valId?: string) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (status !== "success" || !tranId || !valId) {
    if (tranId) await markOrderPaymentFailed(tranId).catch(() => {});
    return NextResponse.redirect(`${siteUrl}/checkout/success?payment_failed=true`);
  }

  try {
    const { verified, amount, orderRef } = await validateSslcommerzPayment(valId);
    if (!verified) {
      await markOrderPaymentFailed(tranId);
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${tranId}&payment_failed=true`);
    }
    // orderRef is SSLCommerz's own tran_id and amount its captured value.
    // Passing both lets markOrderPaid refuse a reference borrowed from another
    // order, or a capture short of the total.
    const settled = await markOrderPaid(tranId, { amount, gatewayOrderRef: orderRef, transactionId: valId });
    if (!settled.ok) {
      console.error("SSLCommerz settlement refused:", settled.reason, { tranId, valId });
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${tranId}&payment_failed=true`);
    }
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${tranId}&payment=sslcommerz`);
  } catch (err) {
    console.error("SSLCommerz verification error:", err);
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${tranId}&payment_failed=true`);
  }
}
