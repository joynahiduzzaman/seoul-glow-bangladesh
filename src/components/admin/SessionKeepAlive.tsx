"use client";

import { useEffect } from "react";

/**
 * Keeps an admin's session alive while they are working.
 *
 * The access token lasts 15 minutes. A refresh token valid for 30 days is set
 * at login and /api/auth/refresh has always existed to trade it for a fresh
 * access token — but nothing ever called it. So anyone who spent more than
 * fifteen minutes on one screen was silently signed out, and the first sign of
 * it was "Unauthorized" when they finally hit Save. Filling in a product with
 * images, a description and an ingredient list takes far longer than that.
 *
 * Refreshing on a timer keeps tokens short-lived, which is the security value
 * of a 15-minute access token, while making the expiry invisible to someone who
 * is actually using the panel. It also refreshes when the tab regains focus,
 * since a laptop that slept through several intervals would otherwise come back
 * to a dead session.
 *
 * A failure is deliberately silent: this is a background keep-alive, and a
 * transient network error must not interrupt someone mid-form. If the session
 * has genuinely ended, the next real request says so.
 */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // comfortably inside the 15-minute access token

export default function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/auth/refresh", { method: "POST" });
      } catch {
        /* background task — the next real request will surface a dead session */
      }
    };

    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    // Covers the machine-was-asleep case, where the interval never fired.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
