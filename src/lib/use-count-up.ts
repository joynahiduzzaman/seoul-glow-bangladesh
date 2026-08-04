"use client";

import { useEffect, useState } from "react";

/**
 * Animates a number counting up from 0 to `target`, using requestAnimationFrame —
 * no extra dependency needed for something this simple. Safe to call even if
 * `target` is 0. Respects prefers-reduced-motion by jumping straight to the value.
 *
 * Note: there is deliberately no "has already run" ref guard here. One used to
 * exist, but combined with React StrictMode's development double-mount it left
 * the counter permanently frozen at 0 — the first mount armed the guard and
 * started the frame loop, the cleanup cancelled that loop, and the second mount
 * hit the guard and returned before ever restarting it. The dependency array is
 * what controls re-running, and the cleanup below already cancels any in-flight
 * animation, so no extra guard is needed.
 */
export function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic — starts fast, settles gently, reads as premium rather than linear/mechanical.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
