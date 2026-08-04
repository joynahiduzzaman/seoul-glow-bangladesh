import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { isEmailConfigured, emailFrom, DEFAULT_FROM } from "@/server/email/client";
import { sendWelcomeEmail } from "@/server/email";

/**
 * Admin-only diagnostic for the mail pipeline.
 *
 * Every user-facing endpoint that sends email deliberately returns success
 * regardless of what the provider did — /api/auth/forgot-password must not
 * reveal whether an address has an account. That is correct, but it also means
 * there is no way to tell a working mail setup from a silently broken one
 * without reading server logs. This exposes the provider's actual answer to an
 * administrator, and nobody else.
 *
 * Never returns the API key, or any part of it.
 */

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const from = emailFrom();
  return NextResponse.json({
    provider: "resend",
    configured: isEmailConfigured(),
    from,
    usingSharedTestSender: from === DEFAULT_FROM,
    // The shared onboarding@resend.dev sender only delivers to the address that
    // owns the Resend account; anything else is rejected by the provider.
    note:
      from === DEFAULT_FROM
        ? "Using Resend's shared onboarding@resend.dev sender: delivery only works to the email address that owns the Resend account. Verify a domain in Resend and set EMAIL_FROM to email real customers."
        : "Using a custom sender. Ensure its domain is verified in Resend.",
  });
}

/** POST { to } — sends a real message and reports what the provider said. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { sent: false, configured: false, error: "RESEND_API_KEY is not set on this deployment." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = typeof body?.to === "string" && body.to.includes("@") ? body.to : admin.email;

  const result = await sendWelcomeEmail(to, admin.name || "there");

  return NextResponse.json({
    sent: result.sent,
    to,
    from: emailFrom(),
    id: result.id ?? null,
    // send() never throws, so a failure arrives here as a value to report.
    error: result.sent
      ? null
      : (result.error as { message?: string })?.message ?? String(result.error ?? "unknown"),
  });
}
