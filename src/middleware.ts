import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Routes hit by external parties rather than our own frontend fetch() calls, so they
// can't be checked against same-origin rules: payment gateways redirect/POST here from
// their own domains, and the abandoned-cart cron authenticates via a bearer secret instead.
const CSRF_EXEMPT_PREFIXES = ["/api/payments/", "/api/cron/"];

/**
 * Lightweight CSRF defense-in-depth for API routes: same-site cookies (sameSite=lax)
 * already block most cross-site form/fetch submissions, but browsers still send an
 * Origin header on cross-origin fetch/XHR — if one shows up and doesn't match this
 * site, reject the request. Requests with no Origin/Referer at all (e.g. same-origin
 * navigations, some non-browser clients) are allowed through rather than guessing wrong.
 *
 * Checks X-Forwarded-Host first: behind a reverse proxy, tunnel, or preview environment
 * (common for cloud dev sandboxes), the browser's Origin reflects the PUBLIC domain,
 * but the plain `Host` header the Node process sees can be an internal address — without
 * this check, every login/checkout/etc. would be wrongly rejected as "cross-site" in
 * those setups, which looks exactly like "the site is broken" from the outside.
 */
function isCrossOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (!host) return false;

  const candidate = origin || referer;
  if (!candidate) return false;

  try {
    const candidateHost = new URL(candidate).host;
    return candidateHost !== host;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Admin route protection ---
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("access_token")?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload || !["ADMIN", "MANAGER", "STAFF"].includes(payload.role)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // --- CSRF origin check for state-changing API requests ---
  if (pathname.startsWith("/api/")) {
    const isExempt = CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isExempt && !SAFE_METHODS.has(req.method) && isCrossOriginRequest(req)) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // `/admin/:path*` matches /admin and everything under it — but NOT
  // /admin-print or /admin-preview-frame, which are sibling segments, not
  // children. The guard inside this file tests `pathname.startsWith("/admin")`
  // and would have caught them; middleware simply never ran for those paths.
  //
  // The effect was that an invoice, packing slip or shipping label — a
  // customer's name, phone, full delivery address and everything they bought —
  // was readable by anyone who had the order id, with no session at all.
  matcher: ["/admin/:path*", "/admin-print/:path*", "/admin-preview-frame/:path*", "/api/:path*"],
};
