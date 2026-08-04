import { bkashProvider } from "./bkash";
import { nagadProvider } from "./nagad";
import { sslcommerzProvider } from "./sslcommerz";
import { shurjopayProvider } from "./shurjopay";
import { PaymentProvider } from "./types";

// Modular payment registry — add a new gateway by implementing PaymentProvider
// and registering it here. Visa/MasterCard/Amex and Rocket are routed through
// SSLCommerz, which is the standard way Bangladeshi merchants accept cards.
export const paymentProviders: Record<string, PaymentProvider> = {
  BKASH: bkashProvider,
  NAGAD: nagadProvider,
  ROCKET: sslcommerzProvider,
  SSLCOMMERZ: sslcommerzProvider,
  SHURJOPAY: shurjopayProvider,
  CARD: sslcommerzProvider,
};

export * from "./types";
