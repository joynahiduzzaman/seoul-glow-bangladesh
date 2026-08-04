import { getTransporter, isEmailConfigured } from "./transporter";
import * as templates from "./templates";

const FROM = process.env.SMTP_FROM || '"Seoul Glow Bangladesh" <seoulglow26@gmail.com>';

/**
 * Core send function. If SMTP isn't configured, logs the email to the console instead of
 * throwing — so registration/checkout/etc. never fail just because mail isn't set up yet.
 */
async function send(to: string, subject: string, html: string, replyTo?: string) {
  const transporter = getTransporter();
  if (!transporter || !isEmailConfigured()) {
    console.log(`[email:not-configured] Would send "${subject}" to ${to}. Add SMTP_* vars in .env to send for real.`);
    return { sent: false };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, replyTo });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { sent: false, error: err };
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  return send(to, "Welcome to Seoul Glow Bangladesh 🌸", templates.welcomeEmail(name));
}

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  return send(to, "Verify your email — Seoul Glow Bangladesh", templates.verificationEmail(name, verifyUrl));
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return send(to, "Reset your password — Seoul Glow Bangladesh", templates.passwordResetEmail(name, resetUrl));
}

export async function sendOrderConfirmationEmail(
  to: string,
  params: Parameters<typeof templates.orderConfirmationEmail>[0]
) {
  return send(to, `Order Confirmed — ${params.orderNumber}`, templates.orderConfirmationEmail(params));
}

export async function sendOrderStatusEmail(to: string, params: Parameters<typeof templates.orderStatusEmail>[0]) {
  return send(to, `Order ${params.orderNumber} update`, templates.orderStatusEmail(params));
}

export async function sendNewsletterWelcomeEmail(to: string) {
  return send(to, "You're on the Glow List ✨", templates.newsletterWelcomeEmail());
}

export async function sendAbandonedCartEmail(to: string, name: string, items: { name: string }[], resumeUrl: string) {
  return send(to, "You left something glowing behind ✨", templates.abandonedCartEmail(name, items, resumeUrl));
}

export async function sendContactFormEmail(params: { name: string; email: string; subject: string; message: string }) {
  const supportInbox = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.SMTP_USER;
  if (!supportInbox) {
    console.log("[email:not-configured] No support inbox configured — contact form message logged only:", params);
    return { sent: false };
  }
  return send(supportInbox, `Contact form: ${params.subject}`, templates.contactFormEmail(params), params.email);
}
