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
 * Deliberately NOT a flat film over the whole frame: shading the middle dims
 * the subject and makes a sharp photograph read as muddy.
 *
 * The weight sits along the bottom, under the lockup, with a gentle left lean
 * from md up. The subject and the upper two-thirds of the frame stay vivid.
 */
function HeroScrim() {
  return (
    <>
      {/* Retuned for a small bottom-anchored lockup rather than the tall
          headline block that used to sit mid-frame. The old left wash held
          rgba(...,0.93) across the first quarter of the image to protect that
          headline; with only an eyebrow, a button and a proof row left, that
          much shading just dulled a third of the photograph for nothing.
          The weight now sits along the bottom, where the lockup actually is,
          and the upper two-thirds of the image is left almost untouched. */}

      {/* Bottom anchor, every size: this is what the copy sits on. The ramp is
          tuned to the lockup's actual extent — the eyebrow sits roughly halfway
          up this band, and an earlier, gentler curve left it at about 0.12
          opacity, far too little to read over bright product photography. */}
      <div className="absolute inset-x-0 bottom-0 h-[76%] bg-[linear-gradient(0deg,rgba(47,42,40,0.97)_0%,rgba(47,42,40,0.93)_18%,rgba(47,42,40,0.80)_38%,rgba(47,42,40,0.54)_58%,rgba(47,42,40,0.22)_80%,rgba(47,42,40,0)_100%)] md:h-[72%]" />

      {/* A left lean from md up, so the lockup's left edge stays seated against
          bright product photography without touching the subject. */}
      <div className="absolute inset-0 hidden md:block bg-[linear-gradient(100deg,rgba(47,42,40,0.70)_0%,rgba(47,42,40,0.42)_26%,rgba(47,42,40,0.14)_50%,rgba(47,42,40,0)_70%)]" />

      {/* Whisper of top shading so the sticky header never floats on a bare highlight. */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/45 to-transparent" />
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
 * Size and tracking are wound in hard below `sm` so the line fits a 320px
 * screen on one row, and open back up from `sm` where there is room. Both
 * failure modes have been seen here: at full tracking the line was ~16px too
 * wide and, held on one line, widened the document so every page carrying the
 * hero scrolled sideways; allowed to wrap instead, its second line landed on
 * the subject's face at the top of the scrim, where there is nothing to read
 * against. Fitting it is the only option that does neither. */
function HeroEyebrow({ children }: { children: React.ReactNode }) {
  return (
    // mb-5, not mb-7: the lockup is a tight bottom-anchored cluster now, and the
    // old gap was sized for a headline following it.
    <span className="mb-5 inline-flex max-w-full items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-rose-gold-light sm:gap-3.5 sm:text-[11px] sm:tracking-[0.32em]">
      <span className="h-px w-5 shrink-0 bg-gradient-to-r from-transparent to-rose-gold-light/70 sm:w-9" aria-hidden="true" />
      <span className="min-w-0 whitespace-nowrap">{children}</span>
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

      {/* mt-10 is the spacing under a full copy block. With no headline the
          lockup is just an eyebrow and a button, and that gap left the eyebrow
          stranded high up where the scrim has barely started — so it tightens
          into one cluster instead. */}
      <div
        className={`flex flex-wrap items-center gap-x-8 gap-y-4 ${
          hasTitle || hasSubtitle ? "mt-10" : "mt-1"
        }`}
      >
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
      // No right padding below sm: three columns have only ~288px to share
      // there, and reserving room for the floating chat button broke "1–3 Days"
      // onto two lines. The row sits below that button now, not beside it.
      className="mt-8 w-full border-t border-white/15 pt-6 sm:mt-9 sm:pr-24"
    >
      {/* The number leads and the label sits underneath — scans far faster than
          one run-on sentence of claims. */}
      <dl className="grid max-w-lg grid-cols-3 gap-3 sm:gap-7">
        {heroStats(dict, brandCount).map(({ srLabel, value, Icon, label }) => (
          <div key={label}>
            {/* The caption lives INSIDE the <dd>. A <dl> (even with div
                wrappers) may only contain <dt>/<dd>, so a sibling <p> here was
                invalid markup and flagged as a serious a11y violation. */}
            <dt className="sr-only">{srLabel}</dt>
            <dd>
              {/* nowrap: "1-3 Days" broke across two lines in a 320px column,
                  which threw the three figures out of alignment. */}
              <span className="flex items-baseline gap-1.5 whitespace-nowrap font-display text-lg font-semibold text-white sm:text-2xl">
                {value}
                {Icon && <Icon size={14} className="mb-0.5 text-rose-gold-light" aria-hidden="true" />}
              </span>
              <span className="mt-1 block text-[9.5px] uppercase tracking-[0.1em] text-white/50 sm:text-[11px] sm:tracking-[0.16em]">{label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

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


      {/* Anchored to the foot of the frame rather than vertically centred.
          With the built-in headline retired the column holds an eyebrow, a
          button and a proof row — centring that little in a tall hero left a
          screen of dead space above it and made the section read as unfinished.
          Bottom-anchoring is also the editorial convention: the photograph owns
          the frame and the lockup sits on it. */}
      <div className={`relative h-full container-px flex flex-col justify-end pb-14 sm:pb-16 lg:pb-20 max-w-2xl ${alignClasses}`}>
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


      {/* Slide controls, grouped into one bottom-right cluster.
          The arrows used to be vertically centered against the left and right
          edges, which put the left arrow directly on top of the (left-aligned)
          headline and body copy. Keeping every control in a single corner also
          reads more considered than two floating chevrons, and leaves the
          center of the frame — where the subject is — completely uncluttered. */}
      {slides.length > 1 && (settings.showArrows || settings.showDots) && (
        <div
          // Lifted clear of the floating chat button, which sits bottom-right and
          // was covering the next-slide arrow on a tablet.
          className="absolute bottom-8 right-6 z-10 flex items-center gap-4 max-xl:bottom-24 md:right-10"
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

      {/* Anchored to the foot of the frame rather than vertically centred.
          With the built-in headline retired the column holds an eyebrow, a
          button and a proof row — centring that little in a tall hero left a
          screen of dead space above it and made the section read as unfinished.
          Bottom-anchoring is also the editorial convention: the photograph owns
          the frame and the lockup sits on it. */}
      <div className="relative h-full container-px mr-auto flex flex-col justify-end pb-14 sm:pb-16 lg:pb-20 items-start text-left max-w-2xl">
        <HeroCopy dict={dict} />
        <HeroProofInline dict={dict} brandCount={brandCount} />
      </div>


      {/* Slide indicators */}
      {/* Same clearance as the carousel controls above. */}
      <div className="absolute bottom-8 right-6 z-10 flex gap-2 max-xl:bottom-24 md:right-10">
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
