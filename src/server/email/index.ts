import { getResend, emailFrom, isEmailConfigured } from "./client";
import * as templates from "./templates";

export interface SendResult {
  sent: boolean;
  id?: string;
  error?: unknown;
}

/**
 * Core send function, and the only place that talks to the mail provider.
 *
 * Email is never load-bearing for the request that triggers it: a customer who
 * completed checkout must not see an error because the mail API had a bad
 * minute. Every failure path here returns { sent: false } and logs — it never
 * throws — so callers can fire-and-forget. When no API key is present the
 * message is logged instead, keeping local development working without an
 * account.
 */
async function send(to: string, subject: string, html: string, replyTo?: string): Promise<SendResult> {
  const resend = getResend();
  if (!resend || !isEmailConfigured()) {
    console.log(`[email:not-configured] Would send "${subject}" to ${to}. Set RESEND_API_KEY to send for real.`);
    return { sent: false };
  }

  try {
    // The SDK reports API-level problems in `error` rather than by throwing, so
    // both that and a genuine exception have to be handled.
    const { data, error } = await resend.emails.send({
      from: emailFrom(),
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error.name, error.message);
      return { sent: false, error };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error(`[email] Send threw for "${subject}" to ${to}:`, err);
    return { sent: false, error: err };
  }
}

export { isEmailConfigured };

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
  const supportInbox = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!supportInbox) {
    console.log("[email:not-configured] No support inbox configured — contact form message logged only:", params);
    return { sent: false };
  }
  return send(supportInbox, `Contact form: ${params.subject}`, templates.contactFormEmail(params), params.email);
}
