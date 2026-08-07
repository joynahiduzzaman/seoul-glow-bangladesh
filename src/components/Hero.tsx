"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { useCountUp } from "@/lib/use-count-up";
import { normalizeHeroSettings, HeroSlide, HeroCarouselSettings, HERO_HEIGHT_CLASSES } from "@/lib/hero-slides";

const SLIDES = [
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=2400&q=85",
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=2400&q=85",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=2400&q=85",
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=2400&q=85",
];

const SLIDE_DURATION = 6000;

/**
 * Darkening scrim behind the hero copy.
 *
 * Deliberately NOT a flat film over the whole frame. The previous version
 * stacked three full-surface gradients plus a radial vignette, which dimmed the
 * center of the photo — exactly where the subject sits — and made the whole
 * hero read as muddy and out-of-focus even though the image itself was fine.
 *
 * Instead: on desktop a single wash anchored to the left that has fully faded
 * out by ~80% across, so the text column is protected while the subject stays
 * vivid and sharp. On mobile the copy sits over the middle of the frame, so
 * there a conventional bottom-up gradient does the work instead.
 */
function HeroScrim() {
  return (
    <>
      {/* Mobile: bottom-weighted, since the copy spans the full width there. */}
      <div className="absolute inset-0 md:hidden bg-gradient-to-t from-ink/95 via-ink/70 to-ink/30" />

      {/* Desktop: left-anchored wash, transparent well before the center. */}
      <div className="absolute inset-0 hidden md:block bg-[linear-gradient(100deg,rgba(47,42,40,0.93)_0%,rgba(47,42,40,0.80)_24%,rgba(47,42,40,0.42)_48%,rgba(47,42,40,0.08)_70%,rgba(47,42,40,0)_84%)]" />

      {/* Right edge, xl+ only: a much gentler counterpart to the left wash, just
          enough to seat the proof column's white text over whatever product
          photography happens to be on that side. Deliberately narrow and weak —
          it must not creep inward and dull the subject in the center. */}
      <div className="absolute inset-y-0 right-0 hidden w-[28%] xl:block bg-[linear-gradient(270deg,rgba(47,42,40,0.74)_0%,rgba(47,42,40,0.38)_48%,rgba(47,42,40,0)_100%)]" />

      {/* Shallow bottom fade — just enough to seat the proof strip and scroll cue. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent" />

      {/* Whisper of top shading so the sticky header never floats on a bare highlight. */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/40 to-transparent" />
    </>
  );
}

/**
 * Full-bleed hero image with a slow Ken Burns push-in.
 *
 * Rendered through next/image (not a raw <img>) so the browser gets a properly
 * encoded, correctly-sized asset instead of a multi-megabyte PNG scaled by the
 * layout engine — the single biggest factor in whether a full-bleed hero reads
 * as crisp or soft. `quality` is pushed above the default because compression
 * artifacts are far more visible at hero scale than anywhere else on the site.
 *
 * The zoom lives on a wrapper rather than the image itself so it composites on
 * the GPU and never forces a re-layout of the copy sitting on top.
 */
function HeroImage({
  src,
  alt,
  priority = false,
  zoom = true,
  durationSec = 8,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  zoom?: boolean;
  durationSec?: number;
}) {
  const reduceMotion = useReducedMotion();
  const animate = zoom && !reduceMotion;

  return (
    <motion.div
      className="absolute inset-0"
      initial={animate ? { scale: 1.005 } : false}
      animate={animate ? { scale: 1.09 } : undefined}
      transition={animate ? { duration: durationSec, ease: "linear" } : undefined}
      // will-change keeps the transform on its own compositor layer; without it
      // Chrome re-rasterizes the (very large) hero bitmap during the zoom, which
      // looks like a soft, shimmering image rather than a smooth push-in.
      style={{ willChange: animate ? "transform" : undefined }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={90}
        sizes="100vw"
        className="object-cover"
      />
    </motion.div>
  );
}

/** Editorial eyebrow: a hairline rule that grows into the text, rather than a
 * bordered pill. Reads quieter and more magazine-like against photography.
 *
 * Tracking is tightened on small screens: at 0.32em this line is a few px too
 * wide for a 390px viewport and wraps, orphaning the last word under the
 * hairline. It opens back up from `sm`, where there's room for it.
 *
 * The tightening was not enough at 320px, where even 0.22em left the line ~16px
 * too wide. Combined with `whitespace-nowrap` that widened the document itself,
 * so every page using the hero scrolled sideways — the horizontal shift was
 * visible site-wide, not just here. The line may now wrap below `sm`; two short
 * lines on the narrowest phones beats a page that slides under the thumb. */
function HeroEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-7 inline-flex max-w-full items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-light sm:gap-3.5 sm:text-[11px] sm:tracking-[0.32em]">
      <span className="h-px w-7 shrink-0 bg-gradient-to-r from-transparent to-rose-gold-light/70 sm:w-9" aria-hidden="true" />
      <span className="min-w-0 sm:whitespace-nowrap">{children}</span>
    </span>
  );
}

/** Vertical side caption — a small editorial anchor borrowed from print layouts
 * (Aesop / Tamburins use the same device). Desktop only; it would crowd mobile. */
function HeroSideCaption() {
  return (
    <div className="pointer-events-none absolute bottom-24 left-6 hidden xl:block">
      <span className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.35em] text-white/30 [writing-mode:vertical-rl]">
        Seoul · Dhaka
        <span className="h-12 w-px bg-white/15" aria-hidden="true" />
      </span>
    </div>
  );
}

/**
 * Renders a headline, italicising any run wrapped in asterisks.
 *
 * The retired default headline set one phrase in italic rose-gold — "Your skin,
 * *glowing* the Korean way." Custom copy needs the same device available or it
 * cannot match the styling it replaced, and the alternative would have been a
 * new column to hold the emphasised phrase separately. `*like this*` costs
 * nothing, needs no schema change, and degrades to plain text when unused.
 *
 * Text between markers is still rendered as text by React, so nothing here can
 * inject markup.
 */
function renderEmphasis(text: string) {
  const parts = text.split(/\*([^*]+)\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    // Odd indices are the captured groups — the emphasised runs.
    i % 2 === 1 ? (
      <span key={i} className="italic text-rose-gold-light">
        {part}
      </span>
    ) : (
      part
    )
  );
}

/** The hero's copy column — one component so the carousel and the site-default
 * hero can never drift apart typographically. */
function HeroCopy({
  dict,
  title,
  subtitle,
  primaryText,
  primaryUrl,
  secondaryText,
  secondaryUrl,
  showSecondary = true,
}: {
  dict: Dictionary;
  title?: string;
  subtitle?: string;
  primaryText?: string;
  primaryUrl?: string;
  secondaryText?: string;
  secondaryUrl?: string;
  showSecondary?: boolean;
}) {
  // Whitespace-only copy counts as absent: an admin clearing a field often
  // leaves a stray space behind, and that must not reserve a headline's worth
  // of vertical space for nothing.
  const hasTitle = Boolean(title && title.trim());
  const hasSubtitle = Boolean(subtitle && subtitle.trim());

  return (
    <>
      <HeroEyebrow>100% Authentic · Direct from Seoul</HeroEyebrow>

      {/* The built-in headline and standfirst are switched off: with no text
          configured the hero is image-led, and nothing is written on top of it.
          Both still render the moment a slide supplies them, through exactly the
          same markup and classes as before — so custom copy is typeset
          identically to the wording this replaced, including the emphasised
          middle phrase below.
          To bring the site defaults back, restore `|| dict.home.heroTitleA/B/C`
          and `|| dict.home.heroDesc` here; the strings are untouched in
          lib/i18n/dictionaries.ts. */}
      {hasTitle && (
        // Type scale steps deliberately: the headline is the only element
        // allowed to be loud. Tight tracking + near-1.0 leading is what
        // separates an editorial display setting from a large default web
        // heading.
        <h1 className="font-display text-[2.85rem] sm:text-6xl lg:text-[4.4rem] xl:text-[5.25rem] font-semibold leading-[0.98] tracking-[-0.025em] text-white [text-wrap:balance] [text-shadow:0_2px_28px_rgba(47,42,40,0.45)]">
          {renderEmphasis(title!)}
        </h1>
      )}

      {/* Hairline between headline and supporting copy — a quiet editorial beat
          that stops the block reading as one undifferentiated stack of text.
          Only earns its place when there is something on both sides of it. */}
      {hasTitle && hasSubtitle && <span className="mt-7 h-px w-16 bg-white/25" aria-hidden="true" />}

      {hasSubtitle && (
        <p
          className={`max-w-[34ch] text-[15px] leading-[1.75] text-white/70 sm:text-base ${
            hasTitle ? "mt-6" : "mt-7"
          }`}
        >
          {subtitle}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Link href={primaryUrl || "/shop"} className="btn-primary px-9">
          {primaryText || dict.home.shopCollection}
        </Link>

        {/* Secondary is an underlined text link rather than a second button:
            two filled buttons compete, and a hero should have exactly one
            unmistakable primary action. */}
        {showSecondary && (
          <Link
            href={secondaryUrl || "/shop?filter=bestseller"}
            className="group relative inline-flex items-center gap-2 py-1 text-sm font-medium text-white/85 transition-colors hover:text-white"
          >
            {secondaryText || dict.home.bestSellers}
            <ArrowRight size={15} className="transition-transform duration-300 ease-silk group-hover:translate-x-1" />
            <span className="absolute bottom-0 left-0 h-px w-0 bg-white/60 transition-all duration-300 ease-silk group-hover:w-full" aria-hidden="true" />
          </Link>
        )}
      </div>
    </>
  );
}

/** The three proof points, defined once and rendered in two different layouts
 * below. Every figure here must be one we can actually stand behind: no
 * invented review counts or customer totals.
 *
 * `brandCount` is passed in rather than counted up here, so the two layouts
 * share a single animation instead of running two independent RAF loops. */
function heroStats(dict: Dictionary, brandCount: number) {
  return [
    { srLabel: "Authenticity guarantee", value: "100%", Icon: ShieldCheck, label: "Authentic Products" },
    { srLabel: "Korean brands stocked", value: `${brandCount}+`, Icon: null, label: dict.home.statBrands },
    // 1–3 business days is the inside-Dhaka promise used at checkout and on the
    // product page — hence the Dhaka-specific label. Don't widen this to all of
    // Bangladesh: outside Dhaka is 2–5 business days, and the two must not
    // contradict each other.
    { srLabel: "Delivery time", value: "1–3 Days", Icon: Truck, label: "Dhaka Delivery" },
  ];
}

/** Proof points as a horizontal strip beneath the copy. Used below `xl`, where
 * there isn't room for a second column beside the headline. */
function HeroProofInline({ dict, brandCount }: { dict: Dictionary; brandCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-12 border-t border-white/12 pt-7 xl:hidden"
    >
      {/* The number leads and the label sits underneath — scans far faster than
          one run-on sentence of claims. */}
      <dl className="grid max-w-lg grid-cols-3 gap-4 sm:gap-7">
        {heroStats(dict, brandCount).map(({ srLabel, value, Icon, label }) => (
          <div key={label}>
            {/* The caption lives INSIDE the <dd>. A <dl> (even with div
                wrappers) may only contain <dt>/<dd>, so a sibling <p> here was
                invalid markup and flagged as a serious a11y violation. */}
            <dt className="sr-only">{srLabel}</dt>
            <dd>
              <span className="flex items-baseline gap-1.5 font-display text-xl font-semibold text-white sm:text-2xl">
                {value}
                {Icon && <Icon size={14} className="mb-0.5 text-rose-gold-light" aria-hidden="true" />}
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">{label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

/**
 * Proof points as a vertical column pinned to the right edge, from `xl` up.
 *
 * The hero previously stacked headline, copy, CTA and proof all in one left
 * column, which left the entire right half of the frame empty. Moving the proof
 * across turns it into a balanced spread — message left, subject center, proof
 * right — without putting anything over the middle of the image where the
 * character sits.
 *
 * Hidden below `xl` (rather than `lg`) because at 1024–1279px the column would
 * crowd the headline; those widths keep the inline strip above instead. Only
 * one of the two is ever `display`ed, so screen readers never hear the stats twice.
 */
function HeroProofColumn({ dict, brandCount }: { dict: Dictionary; brandCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.35 }}
      // right-24 (96px), not right-10: the floating WhatsApp / back-to-top
      // buttons are pinned to the bottom-right and occupy x from (100% - 80px)
      // to (100% - 24px). Ending this column at 100% - 96px keeps it entirely
      // clear of that band, so the two can never overlap at any viewport height
      // — rather than relying on a vertical offset that only holds on tall screens.
      className="absolute right-24 top-1/2 z-10 hidden -translate-y-1/2 xl:block 2xl:right-28"
    >
      <dl className="flex w-[188px] flex-col text-right [text-shadow:0_1px_12px_rgba(47,42,40,0.55)]">
        {heroStats(dict, brandCount).map(({ srLabel, value, Icon, label }, i) => (
          <div key={label} className={i > 0 ? "mt-6 border-t border-white/15 pt-6" : ""}>
            <dt className="sr-only">{srLabel}</dt>
            <dd>
              <span className="flex items-baseline justify-end gap-1.5 font-display text-2xl font-semibold text-white">
                {value}
                {Icon && <Icon size={15} className="mb-0.5 text-rose-gold-light" aria-hidden="true" />}
              </span>
              <span className="mt-1.5 block text-[11px] uppercase tracking-[0.16em] text-white/55">{label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

/** Scroll cue — shared, and deliberately parked bottom-center in its own lane
 * so it never collides with the slide dots (which sit bottom-right). */
function HeroScrollCue({ label }: { label: string }) {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50 text-[11px] tracking-wide"
    >
      <span className="hidden md:inline">{label}</span>
      <ChevronDown size={16} />
    </motion.div>
  );
}

/**
 * Custom multi-slide carousel — only rendered when the Homepage Builder has
 * real slides configured (including a migrated legacy single image). Text and
 * CTAs swap instantly on slide change rather than fading (same reliability
 * principle as the default hero below: core message/CTAs are never opacity-
 * gated). Only the background image gets the fade/slide transition.
 */
function HeroCarousel({
  dict,
  settings,
}: {
  dict: Dictionary;
  settings: HeroCarouselSettings;
}) {
  const activeSlides = settings.slides.filter((s) => s.enabled);
  const slides = activeSlides.length > 0 ? activeSlides : settings.slides.slice(0, 1); // never render truly empty
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const brandCount = useCountUp(12);
  const autoplayOn = settings.autoplaySpeed > 0 && slides.length > 1; // single slide never autoplays

  useEffect(() => {
    if (!autoplayOn || paused) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= slides.length) return settings.loop ? 0 : i;
        return next;
      });
    }, settings.autoplaySpeed);
    return () => clearInterval(timer);
  }, [autoplayOn, paused, slides.length, settings.autoplaySpeed, settings.loop]);

  const safeIndex = Math.min(index, slides.length - 1);
  const slide: HeroSlide = slides[safeIndex];
  const atStart = safeIndex === 0;
  const atEnd = safeIndex === slides.length - 1;

  // The push-in runs for the full time a slide is on screen (plus the outgoing
  // crossfade), so it never visibly "finishes" and sits still before advancing.
  const zoomDuration = (autoplayOn ? settings.autoplaySpeed / 1000 : 14) + 1.4;

  function goTo(i: number) {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }
  function prev() {
    if (atStart && !settings.loop) return;
    goTo(safeIndex - 1);
  }
  function next() {
    if (atEnd && !settings.loop) return;
    goTo(safeIndex + 1);
  }

  // Each branch owns its own horizontal margin — "left" deliberately gets none,
  // so the block sits flush against container-px's left padding instead of
  // being centered like the other two. Previously `mx-auto` was applied
  // unconditionally on the wrapping div below regardless of this choice, so
  // "left" text still rendered in the horizontal center of the hero — right
  // over a centered product/character photo instead of beside it.
  const alignClasses =
    slide.textAlign === "center"
      ? "items-center text-center mx-auto"
      : slide.textAlign === "right"
      ? "items-end text-right ml-auto"
      : "items-start text-left mr-auto";

  // NOTE: "pause on hover" is deliberately NOT wired to this <section>.
  // The hero is full-bleed and (at the default `tall` height) fills the whole
  // viewport, so a visitor's cursor is resting somewhere on it almost the
  // entire time they're looking at the page — pausing on section hover meant
  // autoplay was frozen in practice and the slide never changed. The pause is
  // scoped to the controls cluster instead, which preserves the actual intent:
  // don't advance out from under someone reaching for a dot or arrow.
  return (
    <section className={`relative overflow-hidden bg-ink ${HERO_HEIGHT_CLASSES[settings.height]}`}>
      {/* Background — fade or slide transition per admin setting, plus a slow
          Ken Burns push-in while each slide is on screen. Image only, never text. */}
      <div className={slide.mobileImage ? "absolute inset-0 hidden md:block" : "absolute inset-0"}>
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={settings.transitionType === "slide" ? { x: "100%" } : { opacity: 0 }}
            animate={settings.transitionType === "slide" ? { x: "0%" } : { opacity: 1 }}
            exit={settings.transitionType === "slide" ? { x: "-100%" } : { opacity: 0 }}
            transition={{ duration: settings.transitionType === "slide" ? 0.6 : 1, ease: "easeInOut" }}
          >
            {slide.desktopImage && (
              <HeroImage src={slide.desktopImage} alt={slide.altText} priority={safeIndex === 0} durationSec={zoomDuration} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {slide.mobileImage && (
        <div className="absolute inset-0 md:hidden">
          <AnimatePresence mode="sync">
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            >
              <HeroImage src={slide.mobileImage} alt={slide.altText} priority={safeIndex === 0} durationSec={zoomDuration} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* overlayOpacity (0-100) scales these gradients — 100 reproduces the site's
          original fixed-strength overlay, lower values let a bright image show through more. */}
      <div className="absolute inset-0" style={{ opacity: slide.overlayOpacity / 100 }}>
        <HeroScrim />
      </div>

      <HeroSideCaption />

      <div className={`relative h-full container-px flex flex-col justify-center max-w-2xl ${alignClasses}`}>
        <HeroCopy
          dict={dict}
          title={slide.title}
          subtitle={slide.subtitle}
          primaryText={slide.primaryButtonText}
          primaryUrl={slide.primaryButtonUrl}
          secondaryText={slide.secondaryButtonText}
          secondaryUrl={slide.secondaryButtonUrl}
          showSecondary={slide.secondaryButtonText !== ""}
        />
        <HeroProofInline dict={dict} brandCount={brandCount} />
      </div>

      <HeroProofColumn dict={dict} brandCount={brandCount} />

      {/* Slide controls, grouped into one bottom-right cluster.
          The arrows used to be vertically centered against the left and right
          edges, which put the left arrow directly on top of the (left-aligned)
          headline and body copy. Keeping every control in a single corner also
          reads more considered than two floating chevrons, and leaves the
          center of the frame — where the subject is — completely uncluttered. */}
      {slides.length > 1 && (settings.showArrows || settings.showDots) && (
        <div
          className="absolute bottom-8 right-6 z-10 flex items-center gap-4 md:right-10"
          onMouseEnter={() => settings.pauseOnHover && setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {settings.showDots && (
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ease-silk ${
                    i === safeIndex ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}

          {settings.showArrows && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={prev}
                disabled={atStart && !settings.loop}
                aria-label="Previous slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 backdrop-blur-sm transition-all duration-300 ease-silk hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={next}
                disabled={atEnd && !settings.loop}
                aria-label="Next slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 backdrop-blur-sm transition-all duration-300 ease-silk hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
      )}

      <HeroScrollCue label={dict.home.scrollHint} />
    </section>
  );
}

/**
 * IMPORTANT reliability note (learned the hard way this session): the headline, supporting
 * copy, and CTA buttons below are rendered at full opacity via plain classes — never gated
 * behind a framer-motion "initial opacity:0" state. Only supplementary elements (background
 * crossfade, Ken Burns push-in, trust-row stagger) use motion. If motion ever fails to run
 * for any reason, the core message and both CTAs are still fully visible and clickable — a
 * hero's core conversion elements should never depend on an animation library succeeding.
 */
export default function Hero({
  dict,
  overrides,
}: {
  dict: Dictionary;
  overrides?: Record<string, any>;
}) {
  // normalizeHeroSettings() handles both the new slides[] shape and migrating the
  // old flat single-image shape on the fly. An empty slides[] means nothing has
  // ever been configured via the Homepage Builder — original default hero below,
  // completely unchanged, runs in that case.
  const carousel = normalizeHeroSettings(overrides);
  const hasCustomSlides = carousel.slides.length > 0;

  // Hooks must run unconditionally on every render regardless of which branch
  // below ends up rendering — calling these after an early return would violate
  // React's Rules of Hooks (the component would call a different number of hooks
  // depending on hasCustomSlides, which React does not allow). The interval is a
  // harmless no-op when the carousel branch is the one actually rendering.
  const [slideIndex, setSlideIndex] = useState(0);
  const brandCount = useCountUp(12);

  useEffect(() => {
    if (hasCustomSlides) return;
    const timer = setInterval(() => setSlideIndex((i) => (i + 1) % SLIDES.length), SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [hasCustomSlides]);

  if (hasCustomSlides) {
    return <HeroCarousel dict={dict} settings={carousel} />;
  }

  return (
    <section className="relative h-screen min-h-[640px] max-h-[900px] overflow-hidden bg-ink">
      {/* Cinematic background: crossfade + slow Ken Burns push-in */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={slideIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          >
            <HeroImage
              src={SLIDES[slideIndex]}
              alt=""
              priority={slideIndex === 0}
              durationSec={SLIDE_DURATION / 1000 + 1.4}
            />
          </motion.div>
        </AnimatePresence>
        <HeroScrim />
      </div>

      <HeroSideCaption />

      {/* Content — deliberately spare: one line of eyebrow, one headline, one line of
          copy, two CTAs, one slim proof strip. A premium hero earns trust through
          restraint and whitespace, not by stacking every claim on top of itself. */}
      <div className="relative h-full container-px mr-auto flex flex-col justify-center items-start text-left max-w-2xl">
        <HeroCopy dict={dict} />
        <HeroProofInline dict={dict} brandCount={brandCount} />
      </div>

      <HeroProofColumn dict={dict} brandCount={brandCount} />

      {/* Slide indicators */}
      <div className="absolute bottom-8 right-6 z-10 flex gap-2 md:right-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIndex(i)}
            aria-label={`Show background ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === slideIndex ? "w-8 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>

      <HeroScrollCue label={dict.home.scrollHint} />
    </section>
  );
}
