// Google / Facebook OAuth 2.0 "authorization code" flow.
//
// Nothing here works until real credentials are set in .env:
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
//   FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
// Until then, isConfigured() returns false and the /api/auth/[provider] routes
// redirect back to login with a friendly "not connected yet" message instead of
// crashing — see README §"Social login" for the exact setup steps (redirect URIs
// to whitelist in each provider's developer console, etc).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";
import { signAccessToken, signRefreshToken, setAuthCookies, isRequestSecure } from "./auth";
import { linkGuestOrdersToAccount } from "./orders";
import { generateReferralCode, safeRedirectPath } from "@/lib/utils";

export type OAuthProvider = "google" | "facebook";

interface ProviderProfile {
  oauthId: string;
  email: string | null;
  name: string;
}

function siteUrl(req: { nextUrl: { protocol: string; host: string } }) {
  return process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

function redirectUri(req: { nextUrl: { protocol: string; host: string } }, provider: OAuthProvider) {
  return `${siteUrl(req)}/api/auth/${provider}/callback`;
}

export function isConfigured(provider: OAuthProvider): boolean {
  if (provider === "google") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
}

export function buildAuthorizeUrl(
  req: { nextUrl: { protocol: string; host: string } },
  provider: OAuthProvider,
  state: string
): string {
  const redirect_uri = redirectUri(req, provider);

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    redirect_uri,
    response_type: "code",
    scope: "email public_profile",
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

/** Exchanges the authorization code for tokens, then fetches the person's profile. */
export async function fetchProfile(
  req: { nextUrl: { protocol: string; host: string } },
  provider: OAuthProvider,
  code: string
): Promise<ProviderProfile> {
  const redirect_uri = redirectUri(req, provider);

  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed");
    const tokens = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Google profile fetch failed");
    const profile = await profileRes.json();
    return { oauthId: profile.sub, email: profile.email ?? null, name: profile.name || profile.email || "Google User" };
  }

  const tokenParams = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
    code,
    redirect_uri,
  });
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
  if (!tokenRes.ok) throw new Error("Facebook token exchange failed");
  const tokens = await tokenRes.json();

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokens.access_token)}`
  );
  if (!profileRes.ok) throw new Error("Facebook profile fetch failed");
  const profile = await profileRes.json();
  return { oauthId: profile.id, email: profile.email ?? null, name: profile.name || "Facebook User" };
}

// ---------------------------------------------------------------------------
// Shared start/callback logic — each of the 4 route files (google + facebook,
// start + callback) is just a one-line call into these, so provider-specific
// quirks stay in one place.
// ---------------------------------------------------------------------------

const STATE_COOKIE = "oauth_state";
const REDIRECT_COOKIE = "oauth_redirect";

export function startOAuthFlow(req: NextRequest, provider: OAuthProvider) {
  const origin = siteUrl(req);
  // No fallback to "/" here — an absent redirect is resolved in the callback,
  // once the signed-in user's role is known (customer vs staff land in different
  // default places). Only a genuine explicit redirect gets stored.
  const next = safeRedirectPath(req.nextUrl.searchParams.get("redirect"));

  if (!isConfigured(provider)) {
    const label = provider === "google" ? "Google" : "Facebook";
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("oauthError", `${label} sign-in isn't connected yet. Add ${provider === "google" ? "GOOGLE_CLIENT_ID/SECRET" : "FACEBOOK_CLIENT_ID/SECRET"} to .env to enable it.`);
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildAuthorizeUrl(req, provider, state));
  const secure = isRequestSecure(req);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 10 });
  if (next) {
    res.cookies.set(REDIRECT_COOKIE, next, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 10 });
  }
  return res;
}

export async function handleOAuthCallback(req: NextRequest, provider: OAuthProvider) {
  const origin = siteUrl(req);
  const loginUrl = (message: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("oauthError", message);
    return NextResponse.redirect(url);
  };

  // Providers report refusals by redirecting back with ?error=..., not by
  // omitting the code. Without this branch every such case fell through to the
  // generic "interrupted or expired" message below — so a user who simply
  // pressed Cancel, and an app whose redirect URI is unregistered, produced
  // identical and equally unhelpful text.
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) {
    const label = provider === "google" ? "Google" : "Facebook";
    const description = req.nextUrl.searchParams.get("error_description");
    console.error(`${provider} OAuth refused:`, providerError, description ?? "");

    if (providerError === "access_denied") {
      return loginUrl(`You cancelled ${label} sign-in. You can try again or sign in with email.`);
    }
    if (providerError === "redirect_uri_mismatch") {
      return loginUrl(
        `${label} rejected the sign-in because this site's callback URL is not registered. ` +
          `Add ${redirectUri(req, provider)} to the app's authorised redirect URIs.`
      );
    }
    return loginUrl(`${label} sign-in failed: ${description || providerError}`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  // Not defaulting to "/" here — with no explicit redirect, the destination depends
  // on the signed-in user's role, which isn't known until after account lookup/
  // creation below.
  const next = req.cookies.get(REDIRECT_COOKIE)?.value || null;

  if (!code || !state || !expectedState || state !== expectedState) {
    return loginUrl("Sign-in was interrupted or expired. Please try again.");
  }

  try {
    const profile = await fetchProfile(req, provider, code);

    let user = await prisma.user.findFirst({ where: { oauthProvider: provider, oauthId: profile.oauthId } });

    if (!user && profile.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        // Existing email/password (or other-provider) account — link this provider to it.
        user = await prisma.user.update({ where: { id: byEmail.id }, data: { oauthProvider: provider, oauthId: profile.oauthId } });
      }
    }

    if (!user) {
      if (!profile.email) {
        return loginUrl(`Your ${provider === "google" ? "Google" : "Facebook"} account has no public email, so we can't create an account from it. Please sign up with email instead.`);
      }
      let referralCode = generateReferralCode(profile.name);
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await prisma.user.findUnique({ where: { referralCode } });
        if (!clash) break;
        referralCode = generateReferralCode(profile.name);
      }
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: null,
          oauthProvider: provider,
          oauthId: profile.oauthId,
          role: "CUSTOMER",
          emailVerified: true, // the provider already verified this email
          referralCode,
        },
      });

      // First-time sign-in via this provider — attach any guest orders placed
      // under this same email before the account existed (no phone available
      // from an OAuth profile, so this matches by email only).
      await linkGuestOrdersToAccount(user.id, user.email);
    }

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    setAuthCookies(accessToken, refreshToken, isRequestSecure(req));

    // Same priority as email login: explicit redirect wins; otherwise customers
    // land on their dashboard and staff land in the admin panel.
    const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
    const destination = next || (isStaff ? "/admin" : "/account");

    const res = NextResponse.redirect(new URL(destination, origin));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(REDIRECT_COOKIE);
    return res;
  } catch (err) {
    console.error(`${provider} OAuth error:`, err);
    return loginUrl("Something went wrong signing you in. Please try again.");
  }
}
