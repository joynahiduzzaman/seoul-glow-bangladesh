"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";

/** Pan-and-zoom cropper — the same UX pattern as Facebook/Twitter/Instagram's avatar
 * cropper: a fixed-size viewport at the target aspect ratio, the source image
 * underneath draggable and zoomable, "Apply" rasterizes exactly what's inside the
 * viewport onto a canvas at a fixed output resolution. Simpler and just as capable
 * as a resizable-rectangle cropper for the "pick a region of one image" use case
 * every call site here needs (hero slide images). */
export default function ImageCropModal({
  src,
  aspect,
  onCancel,
  onApply,
}: {
  src: string;
  aspect: number; // width / height
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const VIEWPORT_W = 440;
  const VIEWPORT_H = Math.round(VIEWPORT_W / aspect);

  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function clampOffset(o: { x: number; y: number }, s: number, natural = naturalSize) {
    const dispW = natural.w * s;
    const dispH = natural.h * s;
    const minX = Math.min(0, VIEWPORT_W - dispW);
    const minY = Math.min(0, VIEWPORT_H - dispH);
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) };
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const base = Math.max(VIEWPORT_W / w, VIEWPORT_H / h);
    setNaturalSize({ w, h });
    setMinScale(base);
    setScale(base);
    setOffset(clampOffset({ x: (VIEWPORT_W - w * base) / 2, y: (VIEWPORT_H - h * base) / 2 }, base, { w, h }));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setOffset(clampOffset({ x: dragging.current.origX + dx, y: dragging.current.origY + dy }, scale));
  }
  function onPointerUp() {
    dragging.current = null;
  }
  function handleScaleChange(next: number) {
    setScale(next);
    setOffset((o) => clampOffset(o, next));
  }

  function handleApply() {
    if (!naturalSize.w || !imgRef.current) return;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = VIEWPORT_W / scale;
    const sh = VIEWPORT_H / scale;
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = Math.round(1600 / aspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) onApply(blob);
          else toast.error("Couldn't process the crop — try again");
        },
        "image/jpeg",
        0.92
      );
    } catch {
      toast.error("This image can't be cropped here (blocked by its source) — try uploading a new file instead");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 shadow-2xl w-full max-w-lg p-6">
        <h4 className="font-display text-lg mb-4">Crop image</h4>
        <div
          className="relative mx-auto overflow-hidden rounded-lg bg-ink/5 touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ width: VIEWPORT_W, height: VIEWPORT_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            crossOrigin="anonymous"
            onLoad={handleImgLoad}
            alt=""
            draggable={false}
            className="absolute select-none pointer-events-none max-w-none"
            style={{ left: offset.x, top: offset.y, width: naturalSize.w * scale, height: naturalSize.h * scale }}
          />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[11px] text-ink/70 shrink-0">Zoom</span>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={0.001}
            value={scale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <p className="text-[11px] text-ink/35 mt-2">Drag the image to reposition, use the slider to zoom.</p>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-ink/10 py-2.5 text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleApply} className="flex-1 btn-primary !h-auto !py-2.5">
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
