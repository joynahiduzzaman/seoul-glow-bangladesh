"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import SingleImageUpload from "./SingleImageUpload";
import {
  normalizeHeroSettings,
  makeEmptySlide,
  HeroSlide,
  HeroCarouselSettings,
  MIN_SLIDES,
  MAX_SLIDES,
} from "@/lib/hero-slides";

export default function HeroSlidesEditor({
  rawSettings,
  onChange,
}: {
  rawSettings: Record<string, any>;
  onChange: (settings: HeroCarouselSettings) => void;
}) {
  // normalizeHeroSettings migrates an existing legacy single-image hero into a
  // one-slide array the moment the admin opens this editor — they see their
  // current image/text as "Slide 1" immediately, no separate migration step.
  const [carousel, setCarousel] = useState<HeroCarouselSettings>(() => {
    const normalized = normalizeHeroSettings(rawSettings);
    return normalized.slides.length > 0 ? normalized : { ...normalized, slides: [makeEmptySlide()] };
  });
  const [expandedId, setExpandedId] = useState<string | null>(carousel.slides[0]?.id || null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function update(next: HeroCarouselSettings) {
    setCarousel(next);
    onChange(next);
  }
  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    update({ ...carousel, slides: carousel.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function addSlide() {
    if (carousel.slides.length >= MAX_SLIDES) return;
    const slide = makeEmptySlide();
    update({ ...carousel, slides: [...carousel.slides, slide] });
    setExpandedId(slide.id);
  }
  function removeSlide(id: string) {
    if (carousel.slides.length <= MIN_SLIDES) return;
    update({ ...carousel, slides: carousel.slides.filter((s) => s.id !== id) });
  }
  function moveTo(from: number, to: number) {
    if (to < 0 || to >= carousel.slides.length) return;
    const next = [...carousel.slides];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update({ ...carousel, slides: next });
  }
  function handleDrop(dropIndex: number) {
    if (dragIndex !== null && dragIndex !== dropIndex) moveTo(dragIndex, dropIndex);
    setDragIndex(null);
    setOverIndex(null);
  }
  function updateCarousel(patch: Partial<HeroCarouselSettings>) {
    update({ ...carousel, ...patch });
  }

  return (
    <div className="border-t border-border-soft pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Slides</p>
          <p className="text-[11px] text-ink/70">{carousel.slides.length} of {MAX_SLIDES} · drag to reorder</p>
        </div>
        <button
          type="button"
          onClick={addSlide}
          disabled={carousel.slides.length >= MAX_SLIDES}
          className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-ink/10 px-3 py-2 hover:border-rose-gold hover:text-rose-gold-text transition-colors disabled:opacity-40"
        >
          <Plus size={13} /> Add Slide
        </button>
      </div>

      <div className="space-y-2">
        {carousel.slides.map((slide, i) => {
          const isExpanded = expandedId === slide.id;
          return (
            <div
              key={slide.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={`rounded-xl border bg-white transition-all ${
                overIndex === i && dragIndex !== null && dragIndex !== i ? "border-rose-gold ring-2 ring-rose-gold/30" : "border-ink/10"
              } ${dragIndex === i ? "opacity-40" : ""} ${!slide.enabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="cursor-grab active:cursor-grabbing text-ink/30 shrink-0"><GripVertical size={16} /></span>
                {slide.desktopImage ? (
                  <img src={slide.desktopImage} alt="" className="h-9 w-14 rounded object-cover shrink-0" />
                ) : (
                  <span className="h-9 w-14 rounded bg-beige shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : slide.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium truncate">{slide.title || `Slide ${i + 1}`}</p>
                  <p className="text-[11px] text-ink/70">{slide.enabled ? "Enabled" : "Disabled"}</p>
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-ink/70 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={slide.enabled} onChange={(e) => updateSlide(slide.id, { enabled: e.target.checked })} />
                </label>
                <button
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  disabled={carousel.slides.length <= MIN_SLIDES}
                  aria-label="Delete slide"
                  className="text-ink/30 hover:text-red-500 disabled:opacity-30 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : slide.id)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  className="text-ink/30 hover:text-ink shrink-0"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3.5 space-y-3 border-t border-border-soft pt-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Hero art is full-bleed, so it needs a much higher
                        resolution cap than the shared 1920px default — at 1920
                        a hero is already being upscaled on a wide monitor, and
                        roughly 2x upscaled on a retina display, which is what
                        makes it look soft. */}
                    <SingleImageUpload label="Desktop image" value={slide.desktopImage} onChange={(url) => updateSlide(slide.id, { desktopImage: url })} aspect={16 / 7} maxDimension={3200} />
                    <SingleImageUpload label="Mobile image (optional)" value={slide.mobileImage} onChange={(url) => updateSlide(slide.id, { mobileImage: url })} aspect={3 / 4} maxDimension={1600} />
                  </div>
                  <input placeholder="Alt text (for accessibility)" value={slide.altText} onChange={(e) => updateSlide(slide.id, { altText: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  {/* The placeholders used to promise a "site default" that no
                      longer exists — blank now means the hero shows the image
                      with no headline over it. */}
                  <input placeholder="Headline (leave blank for no headline)" value={slide.title} onChange={(e) => updateSlide(slide.id, { title: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  <p className="-mt-1 text-[11px] leading-relaxed text-ink/50">
                    Wrap a phrase in asterisks to set it in italic rose — e.g. Your skin, *glowing* the Korean way.
                  </p>
                  <textarea placeholder="Supporting line (leave blank for none)" rows={2} value={slide.subtitle} onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Primary button text" value={slide.primaryButtonText} onChange={(e) => updateSlide(slide.id, { primaryButtonText: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                    <input placeholder="Primary button URL" value={slide.primaryButtonUrl} onChange={(e) => updateSlide(slide.id, { primaryButtonUrl: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                    <input placeholder="Secondary button text" value={slide.secondaryButtonText} onChange={(e) => updateSlide(slide.id, { secondaryButtonText: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                    <input placeholder="Secondary button URL" value={slide.secondaryButtonUrl} onChange={(e) => updateSlide(slide.id, { secondaryButtonUrl: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
                  </div>
                  <p className="text-[11px] text-ink/35">Clear the secondary button text to hide that button on this slide.</p>

                  <div className="grid grid-cols-2 gap-3 border-t border-border-soft pt-3.5">
                    <div>
                      <label className="block text-[11px] text-ink/70 mb-1.5">Text alignment</label>
                      <select
                        value={slide.textAlign}
                        onChange={(e) => updateSlide(slide.id, { textAlign: e.target.value as any })}
                        className="w-full rounded-lg border border-ink/10 px-3 py-2.5 text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink/70 mb-1.5">Overlay opacity ({slide.overlayOpacity}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={slide.overlayOpacity}
                        onChange={(e) => updateSlide(slide.id, { overlayOpacity: Number(e.target.value) })}
                        className="w-full mt-3"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Carousel-level behavior — applies across all slides */}
      <div className="border-t border-border-soft pt-4 space-y-3">
        <p className="text-sm font-semibold text-ink">Carousel Behavior</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-ink/70 mb-1.5">Auto slide interval (seconds)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={carousel.autoplaySpeed / 1000}
              onChange={(e) => updateCarousel({ autoplaySpeed: Math.max(1, Number(e.target.value)) * 1000 })}
              className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-ink/70 mb-1.5">Transition</label>
            <select
              value={carousel.transitionType}
              onChange={(e) => updateCarousel({ transitionType: e.target.value === "slide" ? "slide" : "fade" })}
              className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] text-ink/70 mb-1.5">Height</label>
            <select
              value={carousel.height}
              onChange={(e) => updateCarousel({ height: e.target.value as any })}
              className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="tall">Tall (site default)</option>
              <option value="full">Full screen</option>
            </select>
          </div>
        </div>

        {carousel.slides.length <= 1 && (
          <p className="text-[11px] text-gold bg-gold/10 rounded-lg px-3 py-2">Autoplay is automatically disabled with only one slide.</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={carousel.pauseOnHover} onChange={(e) => updateCarousel({ pauseOnHover: e.target.checked })} />
            {/* Scoped to the arrows/dots, not the whole banner — see the note in
                Hero.tsx. Pausing on banner hover froze autoplay permanently,
                since the cursor sits over a full-screen hero almost always. */}
            Pause on arrows/dots hover
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={carousel.loop} onChange={(e) => updateCarousel({ loop: e.target.checked })} />
            Loop
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={carousel.showArrows} onChange={(e) => updateCarousel({ showArrows: e.target.checked })} />
            Navigation arrows
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={carousel.showDots} onChange={(e) => updateCarousel({ showDots: e.target.checked })} />
            Dots
          </label>
        </div>
      </div>
    </div>
  );
}
