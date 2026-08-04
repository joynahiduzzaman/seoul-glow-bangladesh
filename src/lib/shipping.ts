// Shipping management constants — single source of truth for what a Shipment
// record (see prisma/schema.prisma) can look like.

export const COURIERS = ["STEADFAST", "PATHAO", "REDX", "PAPERFLY", "CUSTOM"] as const;
export type CourierValue = (typeof COURIERS)[number];

export const COURIER_LABELS: Record<CourierValue, string> = {
  STEADFAST: "Steadfast",
  PATHAO: "Pathao",
  REDX: "RedX",
  PAPERFLY: "Paperfly",
  CUSTOM: "Custom / Other",
};

export const DELIVERY_STATUSES = [
  "PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;
export type DeliveryStatusValue = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusValue, string> = {
  PENDING: "Pending Pickup",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
  RETURNED: "Returned to Sender",
};
