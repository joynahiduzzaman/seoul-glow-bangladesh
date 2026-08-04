import crypto from "crypto";
import { PaymentProvider, PaymentInitParams, PaymentInitResult } from "./types";

// Nagad Payment Gateway integration (Checkout API).
// Docs: https://developer.mynagad.com/
// Nagad requires RSA signing of the request payload with your merchant private key,
// and verification of Nagad's responses with their public key (both provided in your
// merchant onboarding pack — set NAGAD_MERCHANT_PRIVATE_KEY / NAGAD_PG_PUBLIC_KEY in .env).
const BASE_URL = process.env.NAGAD_BASE_URL || "https://api.mynagad.com/api/dfs";

function sign(data: string) {
  const privateKey = process.env.NAGAD_MERCHANT_PRIVATE_KEY || "";
  const signer = crypto.createSign("SHA256");
  signer.update(data);
  return signer.sign(privateKey, "base64");
}

/**
 * Server-to-server verification, called from the callback route. Nagad's "verify payment"
 * endpoint independently confirms the payment_ref_id actually settled — the redirect alone
 * (which a browser could reload or forge) is never sufficient to mark an order paid.
 */
export async function verifyNagadPayment(paymentRefId: string): Promise<{ verified: boolean; amount?: string; orderRef?: string; raw?: unknown }> {
  const res = await fetch(`${BASE_URL}/verify/payment/${paymentRefId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  const verified = data.status === "Success" || data.issuerPaymentRefNo != null;
  // orderId is OUR order number, echoed back by Nagad — required so the callback
  // cannot settle a different order than the one actually paid for.
  return { verified, amount: data.amount, orderRef: data.orderId, raw: data };
}

export const nagadProvider: PaymentProvider = {
  name: "Nagad",
  isConfigured: () => Boolean(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_PRIVATE_KEY),
  async initPayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const merchantId = process.env.NAGAD_MERCHANT_ID || "";
      const dateTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
      const orderId = params.orderNumber;
      const sensitiveData = JSON.stringify({ merchantId, datetime: dateTime, orderId, challenge: crypto.randomBytes(20).toString("hex") });
      const signature = sign(sensitiveData);

      const initRes = await fetch(`${BASE_URL}/check-out/initialize/${merchantId}/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateTime, sensitiveData, signature }),
      });
      const initData = await initRes.json();

      if (!initData.paymentReferenceId) {
        return { success: false, error: initData.message || "Failed to initialize Nagad payment", raw: initData };
      }

      const paymentRes = await fetch(`${BASE_URL}/check-out/complete/${initData.paymentReferenceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          orderId,
          amount: params.amount.toString(),
          currencyCode: "050",
          challenge: initData.challenge,
          callbackUrl: `${params.callbackBaseUrl}/api/payments/nagad/callback`,
        }),
      });
      const paymentData = await paymentRes.json();

      if (paymentData.callBackUrl) {
        return { success: true, redirectUrl: paymentData.callBackUrl, transactionId: initData.paymentReferenceId, raw: paymentData };
      }
      return { success: false, error: paymentData.message || "Failed to create Nagad payment", raw: paymentData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
