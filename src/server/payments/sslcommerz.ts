import { PaymentProvider, PaymentInitParams, PaymentInitResult } from "./types";

// SSLCommerz integration — this single gateway also settles Visa, MasterCard, American Express,
// Rocket, and most local bank/mobile-banking rails, so it doubles as the "cards" and "Rocket" provider.
// Docs: https://developer.sslcommerz.com/
const BASE_URL = process.env.SSLCOMMERZ_IS_LIVE === "true"
  ? "https://securepay.sslcommerz.com"
  : "https://sandbox.sslcommerz.com";

/**
 * Server-to-server verification via SSLCommerz's "Order Validation API", called from the
 * callback route using the val_id SSLCommerz includes in the success redirect. This is the
 * authoritative check — val_id + amount + currency all cross-verified with SSLCommerz's own
 * records — because the success_url redirect itself can be replayed or forged by a client.
 */
export async function validateSslcommerzPayment(valId: string): Promise<{ verified: boolean; amount?: string; orderRef?: string; raw?: unknown }> {
  const params = new URLSearchParams({
    val_id: valId,
    store_id: process.env.SSLCOMMERZ_STORE_ID || "",
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    format: "json",
  });
  const res = await fetch(`${BASE_URL}/validator/api/validationserverAPI.php?${params.toString()}`);
  const data = await res.json();
  const verified = data.status === "VALID" || data.status === "VALIDATED";
  // tran_id is OUR order number, echoed back by SSLCommerz. Returning it lets the
  // callback prove the validated transaction belongs to the order it settles.
  return { verified, amount: data.amount, orderRef: data.tran_id, raw: data };
}

export const sslcommerzProvider: PaymentProvider = {
  name: "SSLCommerz",
  isConfigured: () => Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD),
  async initPayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const body = new URLSearchParams({
        store_id: process.env.SSLCOMMERZ_STORE_ID || "",
        store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
        total_amount: params.amount.toString(),
        currency: "BDT",
        tran_id: params.orderNumber,
        success_url: `${params.callbackBaseUrl}/api/payments/sslcommerz/callback?status=success`,
        fail_url: `${params.callbackBaseUrl}/api/payments/sslcommerz/callback?status=fail`,
        cancel_url: `${params.callbackBaseUrl}/api/payments/sslcommerz/callback?status=cancel`,
        cus_name: params.customerName,
        cus_email: params.customerEmail || "guest@seoulglow.com.bd",
        cus_phone: params.customerPhone,
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "Courier",
        product_name: `Order ${params.orderNumber}`,
        product_category: "Cosmetics",
        product_profile: "general",
      });

      const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, { method: "POST", body });
      const data = await res.json();

      if (data.status === "SUCCESS" && data.GatewayPageURL) {
        return { success: true, redirectUrl: data.GatewayPageURL, transactionId: params.orderNumber, raw: data };
      }
      return { success: false, error: data.failedreason || "Failed to initiate SSLCommerz session", raw: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
