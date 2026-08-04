export interface CourierShipmentParams {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  district: string;
  area: string;
  codAmount: number; // amount the courier should collect on delivery, 0 if already paid
}

export interface CourierShipmentResult {
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  raw?: unknown;
  error?: string;
}

export interface CourierProvider {
  name: string;
  isConfigured: () => boolean;
  createShipment: (params: CourierShipmentParams) => Promise<CourierShipmentResult>;
}
