import { prisma } from "./db";
import { adjustStock } from "./inventory";
import { notifyUser } from "./notifications";
import { sendOrderConfirmationEmail, sendNewOrderAdminEmail } from "./email";
import { logOrderEvent } from "./order-events";
import { generateOrderNumber, discountedPrice, parseJsonArray, normalizePhone } from "@/lib/utils";

/**
 * The one place that prices an order, validates stock, and creates the DB rows —
 * used by BOTH the customer-facing checkout (POST /api/orders) and the admin's
 * manual order form (POST /api/admin/orders), so a phone/walk-in/Messenger order
 * is priced and recorded through the exact same logic a real checkout uses, not
 * a parallel reimplementation that could quietly drift out of sync (wrong
 * pricing, stock double-counting, missing affiliate credit, etc).
 *
 * What's deliberately NOT here, because it's specific to one caller:
 *  - rate limiting and payment-gateway redirects (checkout-only)
 *  - abandoned-cart-session recovery marking (checkout-only)
 *  - draft-vs-immediate status choice and the staff/source fields (manual-order-only)
 * Each route handles its own slice of that around calls into this module.
 */

export class OrderValidationError extends Error {}

export interface OrderLineInput {
  productId: string;
  quantity: number;
}

export interface VerifiedLine {
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

/** Re-derives real prices and stock from the DB — the client-submitted price is
 * never trusted for money math, only ever used as a display fallback before this
 * runs. `allowInsufficientStock` is for draft orders: a draft can be saved even
 * if stock has run out (nothing is reserved for it yet), but the shortfall is
 * still surfaced so the admin isn't surprised later at confirm time. */
export async function verifyOrderItems(
  items: OrderLineInput[],
  opts: { allowInsufficientStock?: boolean } = {}
): Promise<{ verifiedItems: VerifiedLine[]; subtotal: number; stockWarnings: string[] }> {
  if (items.length === 0) throw new OrderValidationError("This order has no items");

  const productIds = items.map((i) => i.productId);
  const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const stockWarnings: string[] = [];

  const verifiedItems: VerifiedLine[] = items.map((item) => {
    const dbProduct = dbProducts.find((p) => p.id === item.productId);
    if (!dbProduct) throw new OrderValidationError(`Product not found (${item.productId})`);
    if (dbProduct.status === "DRAFT") {
      throw new OrderValidationError(`${dbProduct.name} is no longer available for purchase`);
    }
    if (dbProduct.stock < item.quantity) {
      if (opts.allowInsufficientStock) {
        stockWarnings.push(`${dbProduct.name}: only ${dbProduct.stock} in stock, order requests ${item.quantity}`);
      } else {
        throw new OrderValidationError(`${dbProduct.name} only has ${dbProduct.stock} left in stock`);
      }
    }
    return {
      productId: item.productId,
      name: dbProduct.name,
      image: parseJsonArray(dbProduct.images)[0],
      price: discountedPrice(dbProduct.price, dbProduct.discountPercent),
      quantity: item.quantity,
    };
  });

  const subtotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { verifiedItems, subtotal, stockWarnings };
}

/** Same validity checks as /api/coupons/validate — re-checked here because time
 * can pass between a coupon being applied and the order actually being submitted,
 * during which it could expire or someone else could exhaust its usage limit.
 * An invalid/inapplicable code silently applies no discount rather than erroring,
 * matching the storefront's existing behavior. */
export async function resolveCoupon(code: string | undefined, subtotal: number): Promise<{ discount: number; couponCode?: string }> {
  if (!code) return { discount: 0 };
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const notExpired = !coupon?.expiresAt || coupon.expiresAt > new Date();
  const underLimit = !coupon?.usageLimit || coupon.usedCount < coupon.usageLimit;
  if (coupon && coupon.active && notExpired && underLimit && subtotal >= coupon.minSpend) {
    const discount = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    return { discount, couponCode: coupon.code };
  }
  return { discount: 0 };
}

export async function incrementCouponUsage(code: string) {
  await prisma.coupon.update({ where: { code: code.toUpperCase() }, data: { usedCount: { increment: 1 } } });
}

export interface ShippingInput {
  name: string;
  phone: string;
  district: string;
  area: string;
  street: string;
  insideDhaka: boolean;
  label?: string;
}

export interface CreateOrderRecordInput {
  verifiedItems: VerifiedLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  couponCode?: string;
  paymentMethod: string;
  paymentStatus?: string; // defaults PENDING — checkout leaves this to the gateway callback; manual orders can set it directly
  shipping: ShippingInput;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  giftNote?: string;
  status: "DRAFT" | "PENDING";
  source?: string; // defaults ONLINE
  createdByStaffId?: string;
}

/** Pure record creation — no stock movement, no notifications, no email. A DRAFT
 * order and a real checkout's PENDING order both go through this; what happens
 * next (finalizeOrderEffects, below) is what's actually deferred for a draft. */
export async function createOrderRecord(input: CreateOrderRecordInput) {
  const total = Math.max(0, input.subtotal - input.discount + input.shippingFee);
  const orderNumber = generateOrderNumber();

  return prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      guestEmail: input.userId ? undefined : input.guestEmail,
      guestName: input.userId ? undefined : input.guestName,
      guestPhone: input.userId ? undefined : input.guestPhone,
      subtotal: input.subtotal,
      discount: input.discount,
      shippingFee: input.shippingFee,
      total,
      couponCode: input.couponCode,
      status: input.status,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus || "PENDING",
      shippingLabel: input.shipping.label || "Home",
      shippingName: input.shipping.name,
      shippingPhone: input.shipping.phone,
      shippingDistrict: input.shipping.district,
      shippingArea: input.shipping.area,
      shippingStreet: input.shipping.street,
      insideDhaka: input.shipping.insideDhaka,
      giftNote: input.giftNote,
      source: input.source || "ONLINE",
      createdByStaffId: input.createdByStaffId,
      items: {
        create: input.verifiedItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
        })),
      },
    },
    include: { items: true },
  });
}

type FinalizableOrder = {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  // Optional only so the three existing call sites keep type-checking unchanged
  // — every one of them passes a full Prisma order, so these are present at
  // runtime. They are what makes the store's alert actionable without opening
  // the admin panel.
  shippingPhone?: string | null;
  shippingStreet?: string | null;
  shippingArea?: string | null;
  shippingDistrict?: string | null;
  guestPhone?: string | null;
  source?: string | null;
};

/** Everything that happens once an order is real (not a draft anymore): stock
 * decrement, affiliate commission, confirmation email, in-app notification.
 * Called right after createOrderRecord() for a checkout's immediate PENDING
 * order, or later for a manual order's "Confirm Order" action on a draft. */
export async function finalizeOrderEffects(
  order: FinalizableOrder,
  verifiedItems: VerifiedLine[],
  customerName: string,
  /**
   * `notifyStore` alerts the store inbox that an order came in. Off unless a
   * caller asks for it, so it can only ever be sent by a path that has decided
   * it should be: the storefront checkout does, the admin's own manual-order and
   * confirm-draft actions do not — the team does not need emailing about an
   * order they just typed in themselves.
   *
   * Opt-in rather than opt-out on purpose: a new call site that forgets this
   * stays silent, where the opposite default would quietly start mailing the
   * store from somewhere nobody intended.
   */
  opts: { notifyStore?: boolean } = {}
) {
  for (const item of verifiedItems) {
    await adjustStock(item.productId, -item.quantity, `Order ${order.orderNumber} placed`);
  }

  const fullUser = order.userId ? await prisma.user.findUnique({ where: { id: order.userId } }) : null;

  if (fullUser?.referredById) {
    const commissionPercent = Number(process.env.AFFILIATE_COMMISSION_PERCENT || 10);
    const amount = Math.round((order.total * commissionPercent) / 100);
    await prisma.commission.create({
      data: { referrerId: fullUser.referredById, orderId: order.id, orderNumber: order.orderNumber, amount },
    });
  }

  const recipientEmail = fullUser?.email || order.guestEmail;
  if (recipientEmail) {
    // Awaited on purpose. This used to be fire-and-forget, which is unsafe on
    // serverless: once the response is returned the execution context can be
    // frozen or torn down, so an in-flight request to the mail provider may
    // simply never complete. The extra couple of hundred milliseconds on
    // checkout buys an order confirmation that actually gets sent.
    const result = await sendOrderConfirmationEmail(recipientEmail, {
      orderNumber: order.orderNumber,
      customerName,
      items: verifiedItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
    }).catch((err) => ({ sent: false, error: err }));

    // Record the outcome on the order itself. The previous `.catch(() => {})`
    // discarded every failure, so a rejected send left no trace anywhere — which
    // is exactly how order SGB260805-8994 appeared to succeed while the customer
    // received nothing. An admin can now see it on the order timeline.
    if (result.sent) {
      await logOrderEvent(order.id, "NOTE", `Order confirmation emailed to ${recipientEmail}`, "system");
    } else {
      const reason =
        (result.error as { message?: string })?.message ?? String(result.error ?? "unknown error");
      console.error(`[order ${order.orderNumber}] confirmation email failed:`, reason);
      await logOrderEvent(
        order.id,
        "NOTE",
        `Order confirmation email FAILED to ${recipientEmail}: ${reason.slice(0, 300)}`,
        "system"
      );
    }
  } else {
    await logOrderEvent(order.id, "NOTE", "No email address on this order — no confirmation sent.", "system");
  }

  // Store-side alert, only for callers that asked for one — in practice the
  // storefront checkout. Sent from the one place an order becomes real, so it
  // fires exactly once per order and cannot fire for a draft, a failed
  // checkout, or an order that is later cancelled or deleted — none of those
  // paths reach here. Separate recipient and subject from the customer's
  // confirmation above, so neither replaces the other.
  //
  // Awaited for the same reason as the confirmation, and its outcome recorded
  // on the order: a store alert that quietly stops arriving is exactly the kind
  // of failure nobody notices until an order is missed. It can never fail the
  // order — send() resolves rather than throwing, and the catch covers the rest.
  // Scoped with an `if`, never an early return: the customer's in-app
  // notification is sent below, and returning here would silently drop it for
  // every admin-created order.
  if (opts.notifyStore) {
    const storeAlert = await sendNewOrderAdminEmail({
      orderNumber: order.orderNumber,
      customerName,
      customerEmail: recipientEmail ?? null,
      customerPhone: order.shippingPhone ?? order.guestPhone ?? null,
      shippingAddress: [order.shippingStreet, order.shippingArea, order.shippingDistrict]
        .filter(Boolean)
        .join(", ") || null,
      items: verifiedItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
      placedVia: order.source || "Online checkout",
    }).catch((err: unknown) => ({ sent: false, error: err }));

    if (!storeAlert.sent) {
      const reason = (storeAlert.error as { message?: string })?.message ?? String(storeAlert.error ?? "unknown error");
      console.error(`[order ${order.orderNumber}] store notification failed:`, reason);
      await logOrderEvent(
        order.id,
        "NOTE",
        `Store new-order alert FAILED: ${reason.slice(0, 300)}`,
        "system"
      );
    }
  }

  if (order.userId) {
    notifyUser({
      userId: order.userId,
      type: "ORDER_PLACED",
      title: "Order placed",
      message: `Your order ${order.orderNumber} has been placed and is being processed.`,
      link: `/account/orders/${order.orderNumber}`,
    });
  }
}

/**
 * Called right after a brand-new account is created (email/password register,
 * or a Google/Facebook sign-in that creates a first-time account) — attaches
 * any prior guest orders matching this person's email or phone so they show up
 * in the new account's Order History immediately. Only ever touches orders
 * that have no `userId` yet, so it can't steal an order that already belongs
 * to someone else, and it never creates a User row itself (the caller already
 * did that) — just relinks existing Order rows. Swallows its own errors: a
 * linking failure must never block the account creation/login it followed.
 */
export async function linkGuestOrdersToAccount(userId: string, email: string, phone?: string | null) {
  try {
    // Phone comparison can't be a DB-level equality filter — checkout stores
    // whatever the shopper typed ("01712345678"), while the register form
    // sends its own format ("1712345678", split from a fixed "+880" prefix).
    // normalizePhone() is the same helper the public track-order lookup uses
    // for this exact reason, so both entry points agree on what "matches".
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const candidates = await prisma.order.findMany({
      where: { userId: null },
      select: { id: true, guestEmail: true, shippingPhone: true },
    });
    const matches = candidates.filter(
      (o) => o.guestEmail === email || (normalizedPhone !== null && normalizePhone(o.shippingPhone) === normalizedPhone)
    );
    if (matches.length === 0) return 0;

    await prisma.order.updateMany({ where: { id: { in: matches.map((o) => o.id) } }, data: { userId } });
    for (const o of matches) {
      await logOrderEvent(o.id, "NOTE", "Linked to a newly created customer account", "System");
    }
    return matches.length;
  } catch (err) {
    console.error("Guest order linking failed:", err);
    return 0;
  }
}
