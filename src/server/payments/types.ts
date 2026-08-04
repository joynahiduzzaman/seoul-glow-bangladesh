export interface PaymentInitParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  callbackBaseUrl: string;
}

export interface PaymentInitResult {
  success: boolean;
  redirectUrl?: string;
  transactionId?: string;
  raw?: unknown;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  isConfigured: () => boolean;
  initPayment: (params: PaymentInitParams) => Promise<PaymentInitResult>;
}
