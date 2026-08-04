"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim top progress bar shown while a navigation is in flight.
 *
 * DELIBERATE CHOICE: this replaces a full-page fade/slide transition.
 *
 * A whole-page transition has to hide content that is already painted and
 * delay content that has just arrived, which directly worsens perceived speed
 * and LCP — the opposite of the goal. It also fights App Router streaming,
 * where parts of a page can arrive progressively. Apple, Shopify and Olive
 * Young all navigate instantly and communicate progress with a thin indicator
 * plus skeletons, which is what this does: nothing is ever hidden, and the
 * route-level `loading.tsx` skeletons carry the actual "content is coming"
 * signal.
 *
 * The bar eases toward 90% while loading and snaps to 100% on arrival, so a
 * slow route never looks stalled and a fast one barely flashes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  // Start the bar when any internal link or the back/forward button fires.
  useEffect(() => {
    function start() {
      clearTimers();
      setVisible(true);
      setProgress(8);
      // Ease toward 90% — never reaching it, so the bar keeps moving on a slow
      // route without ever implying it has finished.
      let current = 8;
      const tick = () => {
        current += Math.max(0.5, (90 - current) * 0.12);
        setProgress(Math.min(current, 90));
        if (current < 90) timers.current.push(window.setTimeout(tick, 160));
      };
      timers.current.push(window.setTimeout(tick, 160));
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // External links leave the app entirely — the bar would hang on a page
      // that is about to be replaced.
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return;
      if (href === window.location.pathname + window.location.search) return;
      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
    };
  }, []);

  // The route actually changed — complete and fade out.
  useEffect(() => {
    clearTimers();
    setProgress(100);
    const hide = window.setTimeout(() => setVisible(false), 260);
    const reset = window.setTimeout(() => setProgress(0), 520);
    timers.current.push(hide, reset);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-rose-gold via-gold to-rose-gold-light shadow-[0_0_10px_rgba(198,138,138,0.7)]"
        style={{
          width: `${progress}%`,
          // No transition on the reset back to 0, or the bar visibly rewinds.
          transition: progress === 0 ? "none" : "width 200ms cubic-bezier(0.22, 0.61, 0.36, 1)",
        }}
      />
    </div>
  );
}
