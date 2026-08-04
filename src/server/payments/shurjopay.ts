import { PaymentProvider, PaymentInitParams, PaymentInitResult } from "./types";

// ShurjoPay integration (aggregator supporting bKash, Nagad, Rocket, cards, and net banking under one API).
// Docs: https://shurjopay.com.bd/
const BASE_URL = process.env.SHURJOPAY_BASE_URL || "https://sandbox.shurjopayment.com";

async function getToken() {
  const res = await fetch(`${BASE_URL}/api/get_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.SHURJOPAY_USERNAME,
      password: process.env.SHURJOPAY_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`ShurjoPay auth failed (${res.status})`);
  return res.json();
}

/**
 * Server-to-server verification, called from the callback route. ShurjoPay's "verify"
 * endpoint confirms the order actually settled on their end — required because the
 * return_url redirect alone can be replayed or hit directly without paying.
 */
export async function verifyShurjopayPayment(orderId: string): Promise<{ verified: boolean; amount?: string; raw?: unknown }> {
  const auth = await getToken();
  const res = await fetch(`${BASE_URL}/api/verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ order_id: orderId }),
  });
  const data = await res.json();
  const record = Array.isArray(data) ? data[0] : data;
  const verified = record?.sp_code === "1000" || record?.bank_status === "Success";
  return { verified, amount: record?.amount, raw: data };
}

export const shurjopayProvider: PaymentProvider = {
  name: "ShurjoPay",
  isConfigured: () => Boolean(process.env.SHURJOPAY_USERNAME && process.env.SHURJOPAY_PASSWORD),
  async initPayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const auth = await getToken();
      const res = await fetch(`${BASE_URL}/api/secret-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          prefix: process.env.SHURJOPAY_PREFIX || "SGB",
          token: auth.token,
          order_id: params.orderNumber,
          currency: "BDT",
          amount: params.amount,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail || "guest@seoulglow.com.bd",
          customer_address: "Dhaka",
          customer_city: "Dhaka",
          client_ip: "127.0.0.1",
          return_url: `${params.callbackBaseUrl}/api/payments/shurjopay/callback`,
          cancel_url: `${params.callbackBaseUrl}/api/payments/shurjopay/callback?status=cancel`,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        return { success: true, redirectUrl: data.checkout_url, transactionId: data.sp_order_id, raw: data };
      }
      return { success: false, error: data.message || "Failed to initiate ShurjoPay session", raw: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
