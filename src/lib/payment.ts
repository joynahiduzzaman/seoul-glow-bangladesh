// Payment reconciliation constants — single source of truth for what a Payment
// record (see prisma/schema.prisma) can look like, mirroring the order-status.ts
// pattern for order lifecycle values.

export const PAYMENT_METHODS = ["COD", "BKASH", "NAGAD", "CARD", "STORE"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  COD: "Cash on Delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  CARD: "Card",
  STORE: "In-Store",
};

// bKash/Nagad reconciliation hinges on cross-checking the sender's phone number
// against the merchant statement — the UI prompts for it only for these methods.
export const MOBILE_BANKING_METHODS: PaymentMethodValue[] = ["BKASH", "NAGAD"];

export const PAYMENT_VERIFICATION_STATUSES = ["UNVERIFIED", "VERIFIED", "REJECTED"] as const;
export type PaymentVerificationStatus = (typeof PAYMENT_VERIFICATION_STATUSES)[number];
