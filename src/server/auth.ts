import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { requireSecret } from "./env";

// jose is used (instead of jsonwebtoken) because it works in both the Node.js
// runtime (API routes) and the Edge runtime (middleware) without polyfills.
//
// These are module-scope on purpose: a missing secret takes the process down at
// startup rather than at the first login attempt. There is deliberately no
// fallback value — signing sessions with a default that lives in the repository
// would let anyone who can read the source forge an admin token.
const ACCESS_SECRET = new TextEncoder().encode(requireSecret("JWT_SECRET"));
const REFRESH_SECRET = new TextEncoder().encode(requireSecret("JWT_REFRESH_SECRET"));
// Domain-separated from the access secret so a token minted for one purpose can
// never be replayed as the other.
const ACTION_SECRET = new TextEncoder().encode(`${requireSecret("JWT_SECRET")}:action`);

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: JwtPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "15m")
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: JwtPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || "30d")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// Stateless, single-purpose tokens for email verification / password reset links.
// Purpose-scoped so a verification link can never be replayed as a password-reset link.
export async function signActionToken(userId: string, purpose: "verify-email" | "reset-password", expiresIn: string) {
  return new SignJWT({ userId, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ACTION_SECRET);
}

export async function verifyActionToken(token: string, purpose: "verify-email" | "reset-password") {
  try {
    const { payload } = await jwtVerify(token, ACTION_SECRET);
    if (payload.purpose !== purpose) return null;
    return payload as unknown as { userId: string; purpose: string };
  } catch {
    return null;
  }
}

/** Reads the current logged-in user from the access-token cookie (server components / route handlers). */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * `secure` should reflect whether THIS request actually arrived over HTTPS — not just
 * NODE_ENV. Relying on NODE_ENV alone breaks login whenever someone runs a production
 * build locally over plain HTTP (`npm run build && npm start` on http://localhost),
 * since the browser silently discards a Secure cookie sent over an insecure connection —
 * the login API call succeeds, but the cookie never gets stored, so the user appears to
 * never be logged in. Callers compute this from the incoming request.
 */
export function setAuthCookies(accessToken: string, refreshToken: string, secure: boolean = false) {
  const cookieStore = cookies();
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Derives whether a request arrived over HTTPS, accounting for reverse proxies
 * (Nginx, load balancers) that terminate TLS and forward plain HTTP internally. */
export function isRequestSecure(req: { headers: { get(name: string): string | null }; nextUrl?: { protocol: string } }): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  if (req.nextUrl) return req.nextUrl.protocol === "https:";
  return false;
}

export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}
