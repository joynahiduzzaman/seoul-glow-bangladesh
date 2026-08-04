import { prisma } from "./db";

/**
 * Single place that creates in-app notifications, so every trigger (order placed, order
 * status changed, etc.) stores a consistent shape. Never throws — a notification failing
 * to save should never block the actual business action (placing an order, updating its
 * status) that triggered it.
 */
export async function notifyUser(params: {
  userId: string;
  type: "ORDER_PLACED" | "ORDER_STATUS" | "WELCOME" | "GENERAL";
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({ data: params });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
