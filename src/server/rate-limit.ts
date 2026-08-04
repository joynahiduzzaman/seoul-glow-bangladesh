// Simple in-memory sliding-window rate limiter for sensitive endpoints (login, register,
// password reset, cart-session tracking) to slow down brute-force and spam/abuse attempts.
//
// LIMITATION: this state lives in the Node.js process memory, so it resets on redeploy and
// does NOT share state across multiple server instances/regions. For a multi-instance
// production deployment, replace this with a shared store (Redis / Upstash) using the same
// checkRateLimit(key, ...) interface — nothing else in the codebase needs to change.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Best-effort client identifier from request headers (works behind most proxies/CDNs). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
