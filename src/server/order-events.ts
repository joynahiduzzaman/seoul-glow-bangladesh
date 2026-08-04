import { prisma } from "./db";

export type OrderEventType = "STATUS_CHANGE" | "PAYMENT_CHANGE" | "NOTE" | "ASSIGNMENT" | "TRACKING";

/** Appends one entry to an order's timeline. Kept outside any route.ts on purpose —
 * Next.js's route module type-checking only allows the recognized HTTP-method
 * exports (GET/POST/etc.); any other named export fails `next build`'s type check
 * even though plain `tsc --noEmit` doesn't catch it. */
export async function logOrderEvent(orderId: string, type: OrderEventType, message: string, createdBy: string) {
  await prisma.orderEvent.create({ data: { orderId, type, message, createdBy } });
}
