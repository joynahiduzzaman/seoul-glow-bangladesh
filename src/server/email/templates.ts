import { emailShell, button } from "./shell";
import { formatBDT } from "@/lib/utils";
import { SITE_URL } from "@/lib/site-url";

const siteUrl = SITE_URL;

/** Escapes user-supplied text before it goes into an HTML email. Used for the contact
 * form template, which is the one place in this file that embeds raw free-typed visitor
 * input (name/subject/message) rather than data we generated ourselves. */
function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function welcomeEmail(name: string) {
  return emailShell(
    "Welcome to Seoul Glow Bangladesh",
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Welcome, ${name}! 🌸</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;">Thanks for joining Seoul Glow Bangladesh — your home for 100% authentic Korean skincare, imported directly from South Korea.</p>
     <p style="font-size:14px;line-height:1.6;color:#555;">Browse our curated collection from COSRX, Beauty of Joseon, Anua, and more.</p>
     ${button("Start Shopping", `${siteUrl}/shop`)}`
  );
}

export function verificationEmail(name: string, verifyUrl: string) {
  return emailShell(
    "Verify your email",
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Verify your email</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;">Hi ${name}, please confirm this is your email address to activate your Seoul Glow Bangladesh account.</p>
     ${button("Verify Email", verifyUrl)}
     <p style="font-size:12px;color:#999;margin-top:16px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`
  );
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return emailShell(
    "Reset your password",
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Reset your password</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;">Hi ${name}, we received a request to reset your password.</p>
     ${button("Reset Password", resetUrl)}
     <p style="font-size:12px;color:#999;margin-top:16px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not change.</p>`
  );
}

export function orderConfirmationEmail(params: {
  orderNumber: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
}) {
  const rows = params.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;font-size:13px;color:#333;">${i.name} × ${i.quantity}</td>
          <td style="padding:8px 0;font-size:13px;color:#333;text-align:right;">${formatBDT(i.price * i.quantity)}</td>
        </tr>`
    )
    .join("");

  return emailShell(
    `Order Confirmed — ${params.orderNumber}`,
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 4px;">Thank you, ${params.customerName}!</h2>
     <p style="font-size:14px;color:#555;margin:0 0 20px;">Your order <strong>${params.orderNumber}</strong> has been confirmed.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
       ${rows}
     </table>
     <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:13px;color:#555;">
       <tr><td>Subtotal</td><td style="text-align:right;">${formatBDT(params.subtotal)}</td></tr>
       ${params.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right;color:${"#C68A8A"};">-${formatBDT(params.discount)}</td></tr>` : ""}
       <tr><td>Shipping</td><td style="text-align:right;">${formatBDT(params.shippingFee)}</td></tr>
       <tr><td style="font-weight:700;padding-top:6px;">Total</td><td style="text-align:right;font-weight:700;padding-top:6px;">${formatBDT(params.total)}</td></tr>
     </table>
     <p style="font-size:12px;color:#999;margin-top:16px;">Payment method: ${params.paymentMethod}</p>
     ${button("View Order", `${siteUrl}/checkout/success?order=${params.orderNumber}`)}`
  );
}

export function orderStatusEmail(params: {
  orderNumber: string;
  customerName: string;
  message: string; // e.g. "has been confirmed" — from STATUS_CUSTOMER_MESSAGES
  courier?: string | null;
  trackingNumber?: string | null;
}) {
  const trackingLine =
    params.courier || params.trackingNumber
      ? `<p style="font-size:13px;color:#555;margin:12px 0 0;">${params.courier ? `Courier: ${params.courier}` : ""}${
          params.courier && params.trackingNumber ? " · " : ""
        }${params.trackingNumber ? `Tracking #: ${params.trackingNumber}` : ""}</p>`
      : "";

  return emailShell(
    `Order ${params.orderNumber} update`,
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 4px;">Hi ${params.customerName},</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;margin:0;">Your order <strong>${params.orderNumber}</strong> ${params.message}.</p>
     ${trackingLine}
     ${button("Track Your Order", `${siteUrl}/track-order?order=${params.orderNumber}`)}`
  );
}

export function newsletterWelcomeEmail() {
  return emailShell(
    "You're on the Glow List",
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">You're on the Glow List ✨</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;">You'll now get early access to flash sales, new arrivals, and skincare tips from Seoul Glow Bangladesh.</p>
     ${button("Shop Now", `${siteUrl}/shop`)}`
  );
}

export function abandonedCartEmail(name: string, items: { name: string; image?: string }[], resumeUrl: string) {
  const rows = items
    .slice(0, 4)
    .map((i) => `<tr><td style="padding:6px 0;font-size:13px;color:#333;">${i.name}</td></tr>`)
    .join("");
  return emailShell(
    "You left something glowing behind ✨",
    `<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Still thinking it over, ${name || "there"}?</h2>
     <p style="font-size:14px;line-height:1.6;color:#555;">You left these in your cart:</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">${rows}</table>
     ${button("Complete Your Order", resumeUrl)}`
  );
}

/** Internal notification sent to the support inbox when someone submits the public
 * contact form — not branded for the customer, just a clean readable summary for staff. */
export function contactFormEmail(params: { name: string; email: string; subject: string; message: string }) {
  return emailShell(
    "New Contact Form Submission",
    `<h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 12px;">New message from the Contact page</h2>
     <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;margin-bottom:16px;">
       <tr><td style="padding:4px 0;color:#999;width:80px;">From</td><td>${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;</td></tr>
       <tr><td style="padding:4px 0;color:#999;">Subject</td><td>${escapeHtml(params.subject)}</td></tr>
     </table>
     <p style="font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap;border-left:3px solid #C68A8A;padding-left:12px;">${escapeHtml(params.message)}</p>
     <p style="font-size:12px;color:#999;margin-top:16px;">Reply directly to this email to respond — it'll go straight to ${escapeHtml(params.email)}.</p>`
  );
}
