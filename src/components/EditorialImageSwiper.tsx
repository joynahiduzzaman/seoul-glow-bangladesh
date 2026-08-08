"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The Authenticity section's photo, once there's more than one of them.
 *
 * Built on native scroll-snap rather than a transform carousel: the swipe is
 * then the browser's own, with its real momentum and rubber-banding, and the
 * whole thing still works if JavaScript never runs — the images are laid out in
 * a scroller, so the panel is swipeable from first paint. The dots and arrows
 * are progressive enhancement on top, and follow the hero's treatment so the
 * two read as the same site.
 *
 * A single image renders through the caller's plain <Image> instead, so nothing
 * about the section changes for a shop that only ever uploads one.
 */
export default function EditorialImageSwiper({ images, alt = "" }: { images: string[]; alt?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Derive the active dot from the scroll position rather than tracking it
  // separately — a swipe, an arrow, a dot and a keyboard press then all agree,
  // because every one of them ends as a scroll.
  const indexRef = useRef(0);
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.max(0, Math.min(images.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    indexRef.current = i;
    setIndex(i);
  }, [images.length]);

  // scrollIntoView on the target slide rather than scrollTo(left) on the
  // track: with mandatory snapping, a programmatic smooth scroll past a snap
  // point gets re-snapped mid-flight, so jumping from the first photo to the
  // third landed on the second. Asking the browser to bring a specific element
  // into view lets it do the snapping itself, and it always arrives.
  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    const slide = el.children[next] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
  }, [images.length]);

  // Keeps the right slide framed when the panel is resized (phone rotation, or
  // a desktop window dragged wider) — without this the scroller lands between
  // two images.
  //
  // Subscribed once and gated on the width actually changing. Re-subscribing
  // whenever the index changed meant every scroll re-ran this effect, and
  // ResizeObserver fires immediately on observe — so a smooth scroll from the
  // third photo to the first was cut short the moment it passed the second,
  // which is where it then stopped.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width || el.clientWidth === 0) return;
      width = el.clientWidth;
      el.scrollTo({ left: indexRef.current * width, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="group relative h-full w-full"
      role="group"
      aria-roledescription="carousel"
      aria-label="Photos from Seoul"
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden
                   [scrollbar-width:none] [-ms-overflow-style:none]
                   [&::-webkit-scrollbar]:hidden focus-visible:outline-none"
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full shrink-0 snap-start snap-always"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${images.length}`}
          >
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Dots sit inside the photo, bottom-centre, so the section's layout is
          untouched — nothing below the image moves. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink/35 px-3 py-2 backdrop-blur-sm">
          {images.map((src, i) => (
            <button
              key={`${src}-dot-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              // 24px hit area around a 6px dot — the visible dot is far below
              // the minimum target size on its own.
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ease-silk ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Arrows are a desktop affordance — a phone gets the swipe. Revealed on
          hover/focus so the photo is uncluttered at rest. */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        aria-label="Previous photo"
        className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/30 text-white/90 opacity-0 backdrop-blur-sm transition-all duration-300 ease-silk hover:bg-ink/50 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 md:flex"
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        disabled={index === images.length - 1}
        aria-label="Next photo"
        className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/30 text-white/90 opacity-0 backdrop-blur-sm transition-all duration-300 ease-silk hover:bg-ink/50 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 md:flex"
      >
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
