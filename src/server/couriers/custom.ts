import { CourierProvider } from "./types";

// "Custom / Other" — any courier without an API integration (a local pickup
// service, a one-off carrier). Always "configured" since there's no API to
// wire up; the admin enters the tracking number by hand.
export const customProvider: CourierProvider = {
  name: "Custom",
  isConfigured: () => true,
  async createShipment() {
    return { success: true };
  },
};
