// Shared Hero carousel model — used by both the live Hero component and the
// Homepage Builder's admin editor, so they can never disagree on shape.
//
// Extends the existing hero HomepageSection.settings JSON instead of adding a
// new table/system, per the requirement. Two settings shapes can show up in
// that JSON column over the life of this app:
//   1. OLD flat single-image shape (desktopImage/mobileImage/title/... at the
//      top level) — what every existing installation has today.
//   2. NEW slides[] shape — what the carousel editor writes going forward.
// normalizeHeroSettings() reads either and always returns the new shape,
// migrating (1) into a single-slide array on the fly. Nothing is written back
// automatically — the old data stays untouched in the database until an admin
// actually saves a change in the new editor, at which point it's persisted in
// the new shape. This is a read-time migration, not a destructive one.

export type HeroTextAlign = "left" | "center" | "right";

export interface HeroSlide {
  id: string;
  desktopImage: string;
  mobileImage: string;
  title: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  altText: string;
  enabled: boolean;
  textAlign: HeroTextAlign;
  overlayOpacity: number; // 0-100, darkens the image so white text stays readable
}

export type HeroTransitionType = "fade" | "slide";
export type HeroHeight = "compact" | "standard" | "tall" | "full";

export const HERO_HEIGHT_CLASSES: Record<HeroHeight, string> = {
  compact: "h-[60vh] min-h-[420px] max-h-[560px]",
  standard: "h-[80vh] min-h-[520px] max-h-[760px]",
  tall: "h-screen min-h-[640px] max-h-[900px]",
  full: "h-screen min-h-[640px]",
};

export interface HeroCarouselSettings {
  slides: HeroSlide[];
  autoplaySpeed: number; // ms; auto slide interval — carousel is treated as autoplay-off when <= 0
  transitionType: HeroTransitionType;
  pauseOnHover: boolean;
  loop: boolean;
  showArrows: boolean;
  showDots: boolean;
  height: HeroHeight;
}

export const MIN_SLIDES = 1;
export const MAX_SLIDES = 8;

export const EMPTY_SLIDE: Omit<HeroSlide, "id"> = {
  desktopImage: "",
  mobileImage: "",
  title: "",
  subtitle: "",
  primaryButtonText: "",
  primaryButtonUrl: "/shop",
  secondaryButtonText: "",
  secondaryButtonUrl: "",
  altText: "",
  enabled: true,
  textAlign: "left",
  // 100 reproduces the exact gradient strength the hero always shipped with, so a
  // freshly-added slide looks identical to the site default until an admin
  // deliberately lightens it.
  overlayOpacity: 100,
};

export const DEFAULT_CAROUSEL_SETTINGS: Omit<HeroCarouselSettings, "slides"> = {
  autoplaySpeed: 6000,
  transitionType: "fade",
  pauseOnHover: true,
  loop: true,
  showArrows: true,
  showDots: true,
  height: "tall",
};

function newSlideId(): string {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Normalizes whatever is in HomepageSection.settings (old flat shape, new
 * slides shape, or empty/default) into the current HeroCarouselSettings shape.
 * An empty `slides` array means "nothing custom configured" — Hero.tsx treats
 * that as a signal to render its original site-default hero unchanged. */
export function normalizeHeroSettings(raw: Record<string, any> | undefined | null): HeroCarouselSettings {
  const settings = raw || {};

  if (Array.isArray(settings.slides) && settings.slides.length > 0) {
    const slides: HeroSlide[] = settings.slides.slice(0, MAX_SLIDES).map((s: any) => ({
      id: s.id || newSlideId(),
      desktopImage: s.desktopImage || "",
      mobileImage: s.mobileImage || "",
      title: s.title || "",
      subtitle: s.subtitle || "",
      primaryButtonText: s.primaryButtonText || "",
      primaryButtonUrl: s.primaryButtonUrl || "/shop",
      secondaryButtonText: s.secondaryButtonText || "",
      secondaryButtonUrl: s.secondaryButtonUrl || "",
      altText: s.altText || "",
      enabled: s.enabled !== false,
      textAlign: s.textAlign === "center" || s.textAlign === "right" ? s.textAlign : "left",
      overlayOpacity: typeof s.overlayOpacity === "number" ? Math.min(100, Math.max(0, s.overlayOpacity)) : 100,
    }));
    return {
      slides,
      autoplaySpeed: typeof settings.autoplaySpeed === "number" ? settings.autoplaySpeed : DEFAULT_CAROUSEL_SETTINGS.autoplaySpeed,
      transitionType: settings.transitionType === "slide" ? "slide" : "fade",
      pauseOnHover: settings.pauseOnHover !== false,
      loop: settings.loop !== false,
      showArrows: settings.showArrows !== false,
      showDots: settings.showDots !== false,
      height: ["compact", "standard", "tall", "full"].includes(settings.height) ? settings.height : "tall",
    };
  }

  // Old flat single-image shape — migrate into one slide, in memory only.
  const hasLegacyContent = Boolean(settings.desktopImage || settings.title || settings.subtitle);
  if (hasLegacyContent) {
    return {
      slides: [
        {
          id: newSlideId(),
          desktopImage: settings.desktopImage || "",
          mobileImage: settings.mobileImage || "",
          title: settings.title || "",
          subtitle: settings.subtitle || "",
          primaryButtonText: settings.primaryButtonText || "",
          primaryButtonUrl: settings.primaryButtonUrl || "/shop",
          secondaryButtonText: settings.secondaryButtonText || "",
          secondaryButtonUrl: settings.secondaryButtonUrl || "",
          altText: "",
          enabled: true,
          textAlign: "left",
          overlayOpacity: 100,
        },
      ],
      ...DEFAULT_CAROUSEL_SETTINGS,
    };
  }

  // Nothing configured at all — signal the caller to use site defaults.
  return { slides: [], ...DEFAULT_CAROUSEL_SETTINGS };
}

export function makeEmptySlide(): HeroSlide {
  return { id: newSlideId(), ...EMPTY_SLIDE };
}
