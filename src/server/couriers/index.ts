import { steadfastProvider } from "./steadfast";
import { pathaoProvider } from "./pathao";
import { redxProvider } from "./redx";
import { paperflyProvider } from "./paperfly";
import { customProvider } from "./custom";
import { CourierProvider } from "./types";

// Modular courier registry, mirroring src/server/payments/ — add a real carrier
// integration by implementing CourierProvider and registering it here. Every
// entry currently reports isConfigured() === false (except CUSTOM) until real
// API credentials are added to .env, so the shipment route always has a safe
// manual-entry fallback.
export const courierProviders: Record<string, CourierProvider> = {
  STEADFAST: steadfastProvider,
  PATHAO: pathaoProvider,
  REDX: redxProvider,
  PAPERFLY: paperflyProvider,
  CUSTOM: customProvider,
};

export * from "./types";
