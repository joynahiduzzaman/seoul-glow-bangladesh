import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { isConfigured, type OAuthProvider } from "@/server/oauth";
import { SITE_URL } from "@/lib/site-url";

/**
 * Admin-only report of the social-login configuration.
 *
 * The redirect URI a provider must have registered is derived at request time
 * from NEXT_PUBLIC_SITE_URL, so it changes whenever the site moves — adding a
 * custom domain silently invalidates every URI registered against the old one,
 * and the resulting provider error ("this app's request is invalid") names
 * neither the expected value nor the one that was sent. This prints the exact
 * strings to paste into each console.
 *
 * Only the client ID is echoed — it is public by design, appearing in the
 * authorize URL of every sign-in. Secrets are reported as configured or not,
 * never returned.
 */

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

function describe(provider: OAuthProvider, siteUrl: string) {
  const idVar = provider === "google" ? "GOOGLE_CLIENT_ID" : "FACEBOOK_CLIENT_ID";
  const secretVar = provider === "google" ? "GOOGLE_CLIENT_SECRET" : "FACEBOOK_CLIENT_SECRET";
  const clientId = process.env[idVar]?.trim() || null;

  return {
    provider,
    configured: isConfigured(provider),
    clientIdSet: Boolean(clientId),
    clientSecretSet: Boolean(process.env[secretVar]?.trim()),
    // Public value; shown so a mismatched or truncated paste is visible at a glance.
    clientId,
    redirectUri: `${siteUrl}/api/auth/${provider}/callback`,
    startUrl: `${siteUrl}/api/auth/${provider}`,
    missing: [
      ...(process.env[idVar]?.trim() ? [] : [idVar]),
      ...(process.env[secretVar]?.trim() ? [] : [secretVar]),
    ],
  };
}

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const providers = (["google", "facebook"] as OAuthProvider[]).map((p) => describe(p, SITE_URL));

  return NextResponse.json({
    siteUrl: SITE_URL,
    siteUrlSource: process.env.NEXT_PUBLIC_SITE_URL ? "NEXT_PUBLIC_SITE_URL" : "fallback (see src/lib/site-url.ts)",
    providers,
    note:
      "Register each redirectUri verbatim — scheme, host and path must match exactly, " +
      "with no trailing slash. Note the path order: /api/auth/<provider>/callback, " +
      "which is NOT NextAuth's /api/auth/callback/<provider>. This project does not use NextAuth.",
  });
}
