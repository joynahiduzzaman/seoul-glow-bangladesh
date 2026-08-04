"use client";

import { useRef, useState, useCallback } from "react";
import { RotateCw } from "lucide-react";

/**
 * Drag (or swipe, on touch) left/right to spin through a sequence of product photos —
 * the standard "360° viewer" pattern used by e-commerce sites. Works with any number of
 * frames; more frames (photographed at even angle intervals, e.g. every 15°) = a smoother
 * spin. Two frames still work, they just alternate rather than truly rotate.
 */
export default function Product360Viewer({ frames, name }: { frames: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);

  const rotate = useCallback(
    (deltaX: number) => {
      const sensitivity = 12; // px of drag per frame step
      const steps = Math.round(deltaX / sensitivity);
      if (steps !== 0) {
        setIndex((prev) => {
          const next = (prev - steps) % frames.length;
          return next < 0 ? next + frames.length : next;
        });
        lastX.current += steps * sensitivity;
      }
    },
    [frames.length]
  );

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const deltaX = e.clientX - lastX.current;
    rotate(deltaX);
  }
  function onPointerUp() {
    dragging.current = false;
  }

  if (frames.length === 0) return null;

  return (
    <div className="relative aspect-square rounded-xl2 overflow-hidden bg-beige select-none cursor-grab active:cursor-grabbing">
      <img
        src={frames[index]}
        alt={`${name} — 360° view, frame ${index + 1}`}
        className="h-full w-full object-cover pointer-events-none"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs bg-ink/70 text-cream rounded-full px-3 py-1.5 pointer-events-none">
        <RotateCw size={12} /> Drag to rotate · {index + 1}/{frames.length}
      </div>
    </div>
  );
}
