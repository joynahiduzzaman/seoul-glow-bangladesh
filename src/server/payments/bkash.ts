import { PaymentProvider, PaymentInitParams, PaymentInitResult } from "./types";

// bKash Tokenized Checkout (PGW) integration.
// Docs: https://developer.bka.sh/
// Flow: 1) grant token  2) create payment  3) redirect customer to bkashURL  4) execute payment on callback.
const BASE_URL = process.env.BKASH_BASE_URL || "https://tokenized.pay.bka.sh/v1.2.0-beta";

async function grantToken() {
  const res = await fetch(`${BASE_URL}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: process.env.BKASH_USERNAME || "",
      password: process.env.BKASH_PASSWORD || "",
    },
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`bKash token grant failed (${res.status})`);
  return res.json();
}

/**
 * Server-to-server verification, called from the callback route — never trust the
 * redirect alone. bKash's "execute payment" call is the authoritative confirmation
 * that money actually moved; it also protects against a forged/replayed callback URL,
 * since it independently confirms status and amount with bKash's own servers.
 */
export async function verifyBkashPayment(paymentID: string): Promise<{ verified: boolean; amount?: string; raw?: unknown }> {
  const token = await grantToken();
  const res = await fetch(`${BASE_URL}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token.id_token,
      "X-APP-Key": process.env.BKASH_APP_KEY || "",
    },
    body: JSON.stringify({ paymentID }),
  });
  const data = await res.json();
  const verified = data.transactionStatus === "Completed" || data.statusCode === "0000";
  return { verified, amount: data.amount, raw: data };
}

export const bkashProvider: PaymentProvider = {
  name: "bKash",
  isConfigured: () => Boolean(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME),
  async initPayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const token = await grantToken();
      const createRes = await fetch(`${BASE_URL}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token.id_token,
          "X-APP-Key": process.env.BKASH_APP_KEY || "",
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: params.customerPhone,
          callbackURL: `${params.callbackBaseUrl}/api/payments/bkash/callback`,
          amount: params.amount.toString(),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: params.orderNumber,
        }),
      });
      const data = await createRes.json();
      if (data.bkashURL) {
        return { success: true, redirectUrl: data.bkashURL, transactionId: data.paymentID, raw: data };
      }
      return { success: false, error: data.statusMessage || "Failed to initiate bKash payment", raw: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
