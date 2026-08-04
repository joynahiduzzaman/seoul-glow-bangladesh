import { prisma } from "./db";
import { notifyUser } from "./notifications";
import { sendOrderStatusEmail } from "./email";
import { STATUS_CUSTOMER_MESSAGES, OrderStatus } from "@/lib/order-status";
import { COURIER_LABELS, CourierValue } from "@/lib/shipping";

// Only these five reach a customer by email/SMS — matches the ones with a real
// STATUS_CUSTOMER_MESSAGES entry that customers actually care about mid-flight.
// PENDING is the "just placed" state (already covered by the order-confirmation
// email), and RETURNED/REFUNDED are post-delivery financial states outside this
// requirement's scope.
const NOTIFIABLE_STATUSES: OrderStatus[] = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

/**
 * SMS is not wired to a real provider yet — this stub keeps the call site below
 * provider-agnostic, so plugging in a real Bangladeshi SMS gateway (or Twilio)
 * later is a one-function change here, not a refactor of every place that
 * triggers a status update. Mirrors the same "log instead of throw when
 * unconfigured" pattern used by src/server/email and the payment/courier
 * provider stubs.
 */
async function sendOrderStatusSms(phone: string, message: string) {
  if (!process.env.SMS_PROVIDER_API_KEY) {
    console.log(`[sms:not-configured] Would SMS "${message}" to ${phone}. Add SMS_PROVIDER_API_KEY (and provider-specific vars) in .env to send for real.`);
    return { sent: false };
  }
  // Real provider call goes here once SMS_PROVIDER_API_KEY (and whatever else
  // the chosen gateway needs) is configured.
  return { sent: false };
}

interface NotifiableOrder {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  shippingName: string;
  shippingPhone: string;
}

/**
 * Fires on every order status change — in-app notification for logged-in
 * customers (unchanged from before), plus email (and an SMS-ready stub) for
 * BOTH guest and registered customers, since a guest with no account still
 * deserves to know their order shipped. Never throws: a notification channel
 * failing must never block the status update that triggered it.
 */
export async function notifyOrderStatusChange(order: NotifiableOrder, status: OrderStatus, shipment?: { courier: string; customCourierName: string | null; trackingNumber: string | null } | null) {
  const message = STATUS_CUSTOMER_MESSAGES[status];
  if (!message) return;

  if (order.userId) {
    notifyUser({
      userId: order.userId,
      type: "ORDER_STATUS",
      title: `Order ${order.orderNumber} update`,
      message: `Your order ${message}.`,
      link: `/account/orders/${order.orderNumber}`,
    });
  }

  if (!NOTIFIABLE_STATUSES.includes(status)) return;

  try {
    let email = order.guestEmail;
    if (!email && order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
      email = user?.email ?? null;
    }
    if (email) {
      const courierLabel = shipment ? (shipment.courier === "CUSTOM" ? shipment.customCourierName : COURIER_LABELS[shipment.courier as CourierValue]) : null;
      await sendOrderStatusEmail(email, {
        orderNumber: order.orderNumber,
        customerName: order.shippingName,
        message,
        courier: courierLabel,
        trackingNumber: shipment?.trackingNumber,
      });
    }
  } catch (err) {
    console.error("Order status email failed:", err);
  }

  await sendOrderStatusSms(order.shippingPhone, `Seoul Glow: Order ${order.orderNumber} ${message}.`).catch((err) => {
    console.error("Order status SMS failed:", err);
  });
}
