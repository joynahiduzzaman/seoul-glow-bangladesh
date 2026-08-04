"use client";

import { useEffect } from "react";

/** Silently captures a ?ref=CODE query param (from an affiliate's shared link) into a
 * 30-day cookie, so the code survives browsing and is applied at signup even if the
 * visitor lands on the homepage rather than /register directly. Renders nothing. */
export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      document.cookie = `ref=${encodeURIComponent(ref)};path=/;max-age=${60 * 60 * 24 * 30}`;
    }
  }, []);
  return null;
}
