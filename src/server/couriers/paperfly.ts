import { CourierProvider } from "./types";

// Paperfly's real API is a merchant SOAP/REST hybrid keyed by a merchant code.
// Same not-yet-wired shape as steadfast.ts.
export const paperflyProvider: CourierProvider = {
  name: "Paperfly",
  isConfigured: () => Boolean(process.env.PAPERFLY_MERCHANT_CODE && process.env.PAPERFLY_API_KEY),
  async createShipment() {
    return { success: false, error: "Paperfly API credentials not configured — enter a tracking number manually." };
  },
};
