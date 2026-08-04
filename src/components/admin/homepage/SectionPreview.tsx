"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";

const DEVICE_WIDTHS = { desktop: 1440, tablet: 768, mobile: 390 } as const;
type Device = keyof typeof DEVICE_WIDTHS;

function SkeletonPreview() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-4 w-1/3 bg-beige rounded" />
      <div className="h-8 w-2/3 bg-beige rounded" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square bg-beige rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Hosts the live preview in a real <iframe> pointed at /admin-preview-frame —
 * a separate browsing context is what makes Desktop/Tablet/Mobile genuinely
 * accurate: Tailwind's responsive classes key off the iframe's OWN viewport
 * width (its `width` style), not just a scaled-down div sharing this page's
 * viewport. Settings changes are pushed in via postMessage as you type — no
 * page reload, so it stays smooth even for rapid edits. The iframe element
 * itself is then scaled down (pure CSS transform, paint-only) to fit the
 * modal — that scaling never touches the iframe's internal layout viewport.
 */
export default function SectionPreview({ sectionKey, settings }: { sectionKey: string; settings: Record<string, any> }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [ready, setReady] = useState(false);
  const [frameHeight, setFrameHeight] = useState(500);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  const deviceWidth = DEVICE_WIDTHS[device];

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "seoulglow-preview-ready") setReady(true);
      else if (e.data?.type === "seoulglow-preview-height") setFrameHeight(Math.max(200, e.data.height));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "seoulglow-preview-update", sectionKey, settings }, window.location.origin);
  }, [ready, sectionKey, settings]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) setScale(Math.min(1, width / deviceWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [deviceWidth]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-ink/70">Live preview — reflects your unsaved changes.</p>
        <div className="flex items-center gap-1 bg-beige/60 rounded-lg p-1">
          {(Object.keys(DEVICE_WIDTHS) as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-label={d}
              aria-pressed={device === d}
              className={`p-1.5 rounded-md transition-colors ${device === d ? "bg-white shadow-soft text-rose-gold" : "text-ink/70 hover:text-ink"}`}
            >
              {d === "desktop" && <Monitor size={14} />}
              {d === "tablet" && <Tablet size={14} />}
              {d === "mobile" && <Smartphone size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={outerRef}
        className="relative border border-ink/10 rounded-xl overflow-hidden bg-white mx-auto transition-[height] duration-200"
        style={{ height: frameHeight * scale, maxWidth: device === "desktop" ? "100%" : deviceWidth * scale + 4 }}
      >
        {!ready && (
          <div className="absolute inset-0 z-10">
            <SkeletonPreview />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/admin-preview-frame"
          title="Section preview"
          style={{
            width: deviceWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: "none",
            opacity: ready ? 1 : 0,
            transition: "opacity 200ms",
          }}
        />
      </div>
    </div>
  );
}
