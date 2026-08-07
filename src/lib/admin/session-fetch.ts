/**
 * fetch() for admin writes, with one retry after a silent token refresh.
 *
 * SessionKeepAlive normally stops the access token from lapsing at all, but it
 * cannot cover every case — a laptop asleep through the interval, a tab
 * restored from the back/forward cache, a refresh request that failed while the
 * network was down. Without this, any of those turns a completed form into an
 * "Unauthorized" toast and fifteen minutes of lost typing.
 *
 * So a 401/403 is treated as "the token may simply be stale": refresh once and
 * replay the request. If the refresh token has genuinely expired the retry
 * fails the same way and the caller reports it as before — this only ever turns
 * a recoverable failure into a success, never the reverse.
 *
 * The body is passed as a plain value rather than a stream so the retry can
 * send it again; a consumed ReadableStream cannot be replayed.
 */
export async function fetchWithSession(input: string, init: RequestInit = {}): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401 && first.status !== 403) return first;

  const refreshed = await fetch("/api/auth/refresh", { method: "POST" }).catch(() => null);
  if (!refreshed || !refreshed.ok) return first;

  return fetch(input, init);
}
