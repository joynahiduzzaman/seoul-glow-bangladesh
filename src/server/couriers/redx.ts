import { CourierProvider } from "./types";

// RedX's real API takes an ACCESS-TOKEN header then POST /parcel. Same
// not-yet-wired shape as steadfast.ts.
export const redxProvider: CourierProvider = {
  name: "RedX",
  isConfigured: () => Boolean(process.env.REDX_API_TOKEN),
  async createShipment() {
    return { success: false, error: "RedX API credentials not configured — enter a tracking number manually." };
  },
};
