import { emailShell, button, heading, note, divider, escapeHtml } from "./shell";
import { formatBDT } from "@/lib/utils";
import { SITE_URL } from "@/lib/site-url";

const siteUrl = SITE_URL;
const brand = "#C68A8A";
const muted = "#6B6055";

/**
 * Every value interpolated below is escaped. Customer names come from the
 * registration form and product titles from the admin panel, so both are
 * attacker- or typo-influenced: an unescaped apostrophe corrupts the markup and
 * an unescaped tag can inject into whatever renders the message. Previously only
 * the contact-form template escaped its inputs.
 */

const p = (text: string, extra = "") =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${muted};${extra}">${text}</p>`;

export function welcomeEmail(name: string) {
  return emailShell(
    "Welcome to Seoul Glow Bangladesh",
    `${heading(`Welcome, ${name}`)}
     ${p("Thanks for joining Seoul Glow Bangladesh — your home for 100% authentic Korean skincare, imported directly from South Korea.")}
     ${p("Every product is sourced from the brand or an authorised distributor, so what arrives at your door is exactly what you'd find on a shelf in Seoul.")}
     ${button("Start Shopping", `${siteUrl}/shop`)}
     ${divider()}
     ${p(`<strong style="color:#2F2A28;">Cash on Delivery</strong> across Bangladesh &middot; Dhaka ৳70, outside Dhaka ৳130 &middot; delivered in 1&ndash;5 business days.`, "font-size:13.5px;margin:0;")}`,
    "Your Korean skincare journey starts here — authentic, direct from Seoul."
  );
}

export function verificationEmail(name: string, verifyUrl: string) {
  return emailShell(
    "Verify your email",
    `${heading("Verify your email")}
     ${p(`Hi ${escapeHtml(name)}, please confirm this is your email address to activate your Seoul Glow Bangladesh account.`)}
     ${button("Verify Email", verifyUrl)}
     ${note("This link expires in 24 hours. If you didn't create this account, you can ignore this email.")}`,
    "Confirm your email address to activate your account."
  );
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return emailShell(
    "Reset your password",
    `${heading("Reset your password")}
     ${p(`Hi ${escapeHtml(name)}, we received a request to reset the password on your Seoul Glow Bangladesh account.`)}
     ${button("Reset Password", resetUrl)}
     ${p(`<span style="font-size:12.5px;color:#8A8079;">Button not working? Paste this into your browser:</span><br /><a href="${resetUrl}" style="font-size:12px;color:${brand};word-break:break-all;">${escapeHtml(resetUrl)}</a>`, "margin-top:18px;")}
     ${note("This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not change.")}`,
    "Reset your Seoul Glow Bangladesh password. Link expires in 1 hour."
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
          <td style="padding:11px 0;font-size:14px;color:#2F2A28;border-bottom:1px solid #F1EAE3;">
            ${escapeHtml(i.name)}
            <span style="color:#8A8079;">&times; ${i.quantity}</span>
          </td>
          <td style="padding:11px 0;font-size:14px;color:#2F2A28;text-align:right;white-space:nowrap;border-bottom:1px solid #F1EAE3;">
            ${formatBDT(i.price * i.quantity)}
          </td>
        </tr>`
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false, color = muted) =>
    `<tr>
      <td style="padding:5px 0;font-size:${strong ? "15px" : "13.5px"};color:${strong ? "#2F2A28" : color};${strong ? "font-weight:700;padding-top:10px;" : ""}">${label}</td>
      <td style="padding:5px 0;font-size:${strong ? "15px" : "13.5px"};color:${strong ? "#2F2A28" : color};text-align:right;white-space:nowrap;${strong ? "font-weight:700;padding-top:10px;" : ""}">${value}</td>
    </tr>`;

  return emailShell(
    `Order Confirmed — ${params.orderNumber}`,
    `${heading(`Thank you, ${params.customerName}`)}
     ${p(`Your order <strong style="color:#2F2A28;">${escapeHtml(params.orderNumber)}</strong> is confirmed and being prepared.`)}

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;border-top:1px solid #EDE4DA;">
       ${rows}
     </table>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
       ${totalRow("Subtotal", formatBDT(params.subtotal))}
       ${params.discount > 0 ? totalRow("Discount", `-${formatBDT(params.discount)}`, false, brand) : ""}
       ${totalRow("Shipping", formatBDT(params.shippingFee))}
       ${totalRow("Total", formatBDT(params.total), true)}
     </table>

     ${divider()}
     ${p(`Payment method: <strong style="color:#2F2A28;">${escapeHtml(params.paymentMethod)}</strong>`, "font-size:13.5px;margin:0;")}
     ${button("View Your Order", `${siteUrl}/checkout/success?order=${encodeURIComponent(params.orderNumber)}`)}
     ${note("Questions about this order? Just reply to this email and our team will help.")}`,
    `Order ${params.orderNumber} confirmed — ${formatBDT(params.total)}`
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
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;background:#FAF7F2;border-radius:10px;">
           <tr><td style="padding:14px 16px;font-size:13.5px;color:${muted};">
             ${params.courier ? `Courier: <strong style="color:#2F2A28;">${escapeHtml(params.courier)}</strong>` : ""}
             ${params.courier && params.trackingNumber ? " &middot; " : ""}
             ${params.trackingNumber ? `Tracking #: <strong style="color:#2F2A28;">${escapeHtml(params.trackingNumber)}</strong>` : ""}
           </td></tr>
         </table>`
      : "";

  return emailShell(
    `Order ${params.orderNumber} update`,
    `${heading(`Hi ${params.customerName}`)}
     ${p(`Your order <strong style="color:#2F2A28;">${escapeHtml(params.orderNumber)}</strong> ${escapeHtml(params.message)}.`)}
     ${trackingLine}
     ${button("Track Your Order", `${siteUrl}/track-order?order=${encodeURIComponent(params.orderNumber)}`)}`,
    `Order ${params.orderNumber} ${params.message}`
  );
}

export function newsletterWelcomeEmail() {
  return emailShell(
    "You're on the Glow List",
    `${heading("You're on the Glow List")}
     ${p("You'll now get early access to flash sales, new arrivals, and skincare tips from Seoul Glow Bangladesh.")}
     ${button("Shop Now", `${siteUrl}/shop`)}`,
    "Early access to flash sales, new arrivals and skincare tips."
  );
}

export function abandonedCartEmail(name: string, items: { name: string; image?: string }[], resumeUrl: string) {
  const rows = items
    .slice(0, 4)
    .map(
      (i) =>
        `<tr><td style="padding:9px 0;font-size:14px;color:#2F2A28;border-bottom:1px solid #F1EAE3;">${escapeHtml(i.name)}</td></tr>`
    )
    .join("");

  return emailShell(
    "You left something glowing behind",
    `${heading(`Still thinking it over, ${name || "there"}?`)}
     ${p("You left these in your cart:")}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 0;border-top:1px solid #EDE4DA;">${rows}</table>
     ${button("Complete Your Order", resumeUrl)}`,
    "Your cart is waiting — finish your order in a couple of taps."
  );
}

/**
 * Internal notification to the support inbox when someone submits the public
 * contact form — a clean readable summary for staff, not customer-facing branding.
 */
export function contactFormEmail(params: { name: string; email: string; subject: string; message: string }) {
  return emailShell(
    "New Contact Form Submission",
    `${heading("New message from the Contact page")}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13.5px;color:#2F2A28;margin-bottom:18px;">
       <tr><td style="padding:5px 0;color:#8A8079;width:78px;">From</td><td>${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;</td></tr>
       <tr><td style="padding:5px 0;color:#8A8079;">Subject</td><td>${escapeHtml(params.subject)}</td></tr>
     </table>
     <div style="font-size:14.5px;line-height:1.7;color:#2F2A28;white-space:pre-wrap;border-left:3px solid ${brand};padding-left:14px;">${escapeHtml(params.message)}</div>
     ${note(`Reply directly to this email to respond — it will go straight to ${params.email}.`)}`,
    `${params.subject} — from ${params.name}`
  );
}

/**
 * Store-side alert for a newly placed order.
 *
 * Deliberately the same shell and helpers as every other message rather than a
 * plain-text dump: it lands in the same inbox as customer replies, and a
 * consistent look is what makes it scannable there. It carries what the team
 * needs to act without opening the admin panel — what was bought, where it is
 * going, and how it will be paid for — and links straight to the order.
 *
 * Distinct from orderConfirmationEmail in subject, heading and recipient, so
 * the two can never be mistaken for each other in a shared mailbox.
 */
export function newOrderAdminEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  placedVia: string;
}) {
  const rows = params.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:11px 0;font-size:14px;color:#2F2A28;border-bottom:1px solid #F1EAE3;">
            ${escapeHtml(i.name)}
            <span style="color:#8A8079;">&times; ${i.quantity}</span>
          </td>
          <td style="padding:11px 0;font-size:14px;color:#2F2A28;text-align:right;white-space:nowrap;border-bottom:1px solid #F1EAE3;">
            ${formatBDT(i.price * i.quantity)}
          </td>
        </tr>`
    )
    .join("");

  const detail = (label: string, value?: string | null) =>
    value
      ? `<tr>
          <td style="padding:4px 0;font-size:13.5px;color:${muted};white-space:nowrap;">${label}</td>
          <td style="padding:4px 12px;font-size:13.5px;color:#2F2A28;">${escapeHtml(value)}</td>
        </tr>`
      : "";

  const totalRow = (label: string, value: string, strong = false, color = muted) =>
    `<tr>
      <td style="padding:5px 0;font-size:${strong ? "15px" : "13.5px"};color:${strong ? "#2F2A28" : color};${strong ? "font-weight:700;padding-top:10px;" : ""}">${label}</td>
      <td style="padding:5px 0;font-size:${strong ? "15px" : "13.5px"};color:${strong ? "#2F2A28" : color};text-align:right;white-space:nowrap;${strong ? "font-weight:700;padding-top:10px;" : ""}">${value}</td>
    </tr>`;

  const unitCount = params.items.reduce((n, i) => n + i.quantity, 0);

  return emailShell(
    `New order — ${params.orderNumber}`,
    `${heading(`New order · ${escapeHtml(params.orderNumber)}`)}
     ${p(`<strong style="color:#2F2A28;">${escapeHtml(params.customerName)}</strong> placed an order for <strong style="color:#2F2A28;">${formatBDT(params.total)}</strong> — ${unitCount} item${unitCount === 1 ? "" : "s"}, paid by ${escapeHtml(params.paymentMethod)}.`)}

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;">
       ${detail("Email", params.customerEmail)}
       ${detail("Phone", params.customerPhone)}
       ${detail("Ship to", params.shippingAddress)}
       ${detail("Placed via", params.placedVia)}
     </table>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;border-top:1px solid #EDE4DA;">
       ${rows}
     </table>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
       ${totalRow("Subtotal", formatBDT(params.subtotal))}
       ${params.discount > 0 ? totalRow("Discount", `-${formatBDT(params.discount)}`, false, brand) : ""}
       ${totalRow("Shipping", formatBDT(params.shippingFee))}
       ${totalRow("Total", formatBDT(params.total), true)}
     </table>

     ${divider()}
     ${button("Open in Admin", `${siteUrl}/admin/orders`)}
     ${note("You are receiving this because you are the store's order inbox.")}`,
    `${params.customerName} ordered ${formatBDT(params.total)} — ${params.orderNumber}`
  );
}
