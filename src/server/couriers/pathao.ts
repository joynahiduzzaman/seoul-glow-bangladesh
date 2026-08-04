import { CourierProvider } from "./types";

// Pathao Courier's real API is OAuth2 (client id/secret -> access token) then
// POST /aladdin/api/v1/orders. Same not-yet-wired shape as steadfast.ts.
export const pathaoProvider: CourierProvider = {
  name: "Pathao",
  isConfigured: () => Boolean(process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET),
  async createShipment() {
    return { success: false, error: "Pathao API credentials not configured — enter a tracking number manually." };
  },
};
