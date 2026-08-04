"use client";

import { useEffect, useState } from "react";

function getTimeParts(msLeft: number) {
  const clamped = Math.max(0, msLeft);
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  return { h, m, s };
}

/** Counts down to the next midnight (Asia/Dhaka-ish local time) — "today's flash sale
 * ends at midnight" is honest urgency, not a fake countdown that resets on refresh. */
export default function FlashSaleCountdown() {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setMsLeft(midnight.getTime() - now.getTime());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (msLeft === null) return null;
  const { h, m, s } = getTimeParts(msLeft);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    // A deeper red than `badge-sale-text`, because this pill's own 10% tint sits
    // on the beige flash-sale banner rather than on white: measured 3.42:1 there
    // versus 5.10:1 for this tone. The tint keeps the brand red.
    <div className="inline-flex items-center gap-1.5 rounded-full bg-badge-sale/10 px-3 py-1.5 text-[#B8001F]">
      <span className="text-xs font-semibold">Ends in</span>
      <span className="font-mono text-sm font-bold tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
    </div>
  );
}
