import { CourierProvider } from "./types";

// Steadfast Courier's real API (api.steadfast.com.bd/api/v1/create_order) takes
// an Api-Key/Secret-Key header pair and returns a consignment_id + tracking_code.
// Wiring the real HTTP call is a small, isolated change once credentials exist —
// until then this stays unconfigured and the shipment route falls back to a
// manually-entered tracking number, exactly like an unconfigured payment gateway
// falls back to a pending-payment order (see src/server/payments/*).
export const steadfastProvider: CourierProvider = {
  name: "Steadfast",
  isConfigured: () => Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY),
  async createShipment() {
    return { success: false, error: "Steadfast API credentials not configured — enter a tracking number manually." };
  },
};
