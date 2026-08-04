import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyBkashPayment } from "@/server/payments/bkash";
import { markOrderPaid, markOrderPaymentFailed } from "@/server/payments/confirm";

// bKash redirects here after the customer approves/cancels payment on their app, with
// paymentID + status as query params. We NEVER trust that redirect alone — we call bKash's
// "execute payment" endpoint server-to-server to independently confirm the transaction
// actually completed before marking the order paid.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentID = searchParams.get("paymentID");
  const status = searchParams.get("status");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (status !== "success" || !paymentID) {
    return NextResponse.redirect(`${siteUrl}/checkout/success?payment_failed=true`);
  }

  const order = await prisma.order.findFirst({ where: { gatewayTransactionId: paymentID } });
  if (!order) {
    return NextResponse.redirect(`${siteUrl}/checkout/success?payment_failed=true`);
  }

  try {
    const { verified, amount } = await verifyBkashPayment(paymentID);
    if (!verified) {
      await markOrderPaymentFailed(order.orderNumber);
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${order.orderNumber}&payment_failed=true`);
    }
    // The order is already bound by the gatewayTransactionId lookup above, so no
    // gatewayOrderRef is needed here — but the captured amount still must match.
    const settled = await markOrderPaid(order.orderNumber, { amount, transactionId: paymentID });
    if (!settled.ok) {
      console.error("bKash settlement refused:", settled.reason, { paymentID });
      return NextResponse.redirect(`${siteUrl}/checkout/success?order=${order.orderNumber}&payment_failed=true`);
    }
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${order.orderNumber}&payment=bkash`);
  } catch (err) {
    console.error("bKash verification error:", err);
    return NextResponse.redirect(`${siteUrl}/checkout/success?order=${order.orderNumber}&payment_failed=true`);
  }
}
