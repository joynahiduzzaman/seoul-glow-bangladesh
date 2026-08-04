"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SWIPE_THRESHOLD_PX = 50;

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const gallery = images.length > 0 ? images : ["/logo.png"];

  function goTo(index: number) {
    setActive(Math.max(0, Math.min(gallery.length - 1, index)));
  }

  // Desktop: cursor-following magnify, in the style of premium product pages
  // (Zara/Apple-style loupe) rather than the flat scale(1.05) this used to be.
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  // Mobile: swipe left/right between images. Touch events only fire on touch
  // devices, so this never interferes with the desktop mouse-move zoom above.
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) goTo(active + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
  }

  return (
    <div>
      <div
        className="group relative aspect-square rounded-xl2 overflow-hidden bg-beige mb-4 ring-1 ring-ink/5 cursor-zoom-in select-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={gallery[active]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-300 ease-out"
          style={zooming ? { transform: "scale(1.9)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
          priority
        />

        {/* Prev/next arrows — desktop only (mobile uses swipe); hidden at the ends */}
        {gallery.length > 1 && (
          <>
            {active > 0 && (
              <button
                onClick={() => goTo(active - 1)}
                aria-label="Previous image"
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-soft"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {active < gallery.length - 1 && (
              <button
                onClick={() => goTo(active + 1)}
                aria-label="Next image"
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-soft"
              >
                <ChevronRight size={16} />
              </button>
            )}
            {/* Mobile image counter — the only position indicator on touch, since there's no hover affordance */}
            <span className="md:hidden absolute bottom-3 right-3 rounded-full bg-ink/70 text-white text-[11px] px-2.5 py-1">
              {active + 1} / {gallery.length}
            </span>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {gallery.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={active === i}
              className={`relative h-16 w-16 shrink-0 rounded-xl overflow-hidden ring-2 transition-all duration-300 ${
                active === i ? "ring-rose-gold" : "ring-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img} alt={`${name} ${i + 1}`} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
