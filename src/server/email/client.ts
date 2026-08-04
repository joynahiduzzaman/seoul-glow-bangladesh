import { Resend } from "resend";

/**
 * Resend-backed transport.
 *
 * This replaced Nodemailer/SMTP. SMTP is a poor fit for serverless: every cold
 * invocation pays a TCP + TLS + AUTH handshake before it can send, connections
 * cannot be pooled across invocations, and several hosts block outbound port 587
 * outright. Resend is a plain HTTPS API, so a send is one request with no
 * connection state to keep alive.
 *
 * Credentials stay optional. Without RESEND_API_KEY the caller logs the message
 * instead of sending, so registration and checkout still work on a fresh clone
 * with no mail account — which is why nothing here throws at import time.
 */

/**
 * Verified sender. Resend allows onboarding@resend.dev with no DNS setup, which
 * is what this project uses today. Sending from a custom domain requires
 * verifying it in Resend (SPF/DKIM records) and then setting EMAIL_FROM.
 *
 * Note: onboarding@resend.dev can only deliver to the address that owns the
 * Resend account. Mail to customers will be rejected until a domain is verified.
 */
export const DEFAULT_FROM = "Seoul Glow Bangladesh <onboarding@resend.dev>";

export function emailFrom(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key.trim() !== "");
}

let client: Resend | null = null;

/** Returns the shared client, or null when no API key is configured. */
export function getResend(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
