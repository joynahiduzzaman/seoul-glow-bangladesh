import nodemailer from "nodemailer";

// Works with ANY standard SMTP provider — Gmail, SendGrid, Mailgun, Amazon SES,
// Zoho, or your own mail server. Just fill in the SMTP_* variables in .env.
// If SMTP_HOST is not configured, emails are logged to the console instead of sent
// (so the app never crashes in local development without mail credentials).
let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporter;
}

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}
