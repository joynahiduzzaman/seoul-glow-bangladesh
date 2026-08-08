// Central registry for the Homepage Builder. Every homepage section — what it's
// called in the admin UI, its default settings, what kind of content controls it
// exposes, and whether it can be deleted — is defined here once. Both the admin
// builder page and the live homepage read from this file, so they can never drift
// out of sync with each other.
//
// Adding a future section (Video Banner, TikTok Feed, etc.) means adding one
// entry here plus wiring its renderer in src/app/page.tsx — nothing about the
// builder UI itself needs to change, per the "future ready" requirement.

export interface SectionDefinition {
  key: string;
  label: string;
  description: string;
  isCustom: boolean; // custom (admin-created) sections can be duplicated/deleted; built-in ones can't
  defaultSettings: Record<string, any>;
  // Capability flags — which shared field groups SectionSettingsModal renders for
  // this section. A section can combine several (e.g. flashSale has both a product
  // picker and a "view all" button).
  hasTitleSubtitle?: boolean; // heading + subheading text overrides
  hasProductSelection?: boolean; // productLimit + auto/manual mode + product picker
  hasCategorySelection?: boolean; // grid columns + limit + auto/manual mode + category picker
  hasBrandSelection?: boolean; // limit + auto/manual mode + brand picker
  hasBlogSelection?: boolean; // postLimit + auto/manual mode + post picker
  hasViewAllButton?: boolean; // show/hide + label + URL for the section's "View all" link
  hasCountdown?: boolean; // flash-sale-style countdown toggle
  hasImage?: boolean; // a single uploadable image stored on settings.image
}

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "hero",
    label: "Hero Banner",
    description: "The full-height banner at the very top of the homepage.",
    isCustom: false,
    // Empty on purpose — normalizeHeroSettings() (src/lib/hero-slides.ts) treats an
    // empty settings object as "nothing configured yet" and falls back to the
    // site's original default hero. Once an admin adds slides via the Homepage
    // Builder, this gets replaced with the real { slides: [...] } shape.
    defaultSettings: {},
  },
  {
    key: "categories",
    label: "Categories",
    description: "Shop-by-category grid.",
    isCustom: false,
    defaultSettings: { title: "", subtitle: "", columns: 6, limit: 6, mode: "auto", categoryIds: [] },
    hasTitleSubtitle: true,
    hasCategorySelection: true,
  },
  {
    key: "featuredProducts",
    label: "Featured Products",
    description: "Editorial split section pairing a story with featured picks.",
    isCustom: false,
    defaultSettings: {
      title: "", subtitle: "", productLimit: 4, mode: "auto", productIds: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasProductSelection: true,
    hasViewAllButton: true,
  },
  {
    key: "flashSale",
    label: "Flash Sale",
    description: "Time-limited deals rail with a countdown.",
    isCustom: false,
    defaultSettings: {
      title: "Flash Sale", subtitle: "", productLimit: 8, showCountdown: true, mode: "auto", productIds: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasProductSelection: true,
    hasViewAllButton: true,
    hasCountdown: true,
  },
  {
    key: "bestSellers",
    label: "Best Sellers",
    description: "Spotlight on top-selling products.",
    isCustom: false,
    defaultSettings: {
      title: "", subtitle: "", productLimit: 4, mode: "auto", productIds: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasProductSelection: true,
    hasViewAllButton: true,
  },
  {
    key: "brandShowcase",
    label: "Brand Showcase",
    description: "Grid of partner Korean skincare brands.",
    isCustom: false,
    defaultSettings: { title: "", subtitle: "", limit: 6, mode: "auto", brandIds: [] },
    hasTitleSubtitle: true,
    hasBrandSelection: true,
  },
  {
    key: "newArrivals",
    label: "New Arrivals",
    description: "Rail of the newest products added to the shop.",
    isCustom: false,
    defaultSettings: {
      title: "New Arrivals", subtitle: "", productLimit: 8, mode: "auto", productIds: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasProductSelection: true,
    hasViewAllButton: true,
  },
  {
    key: "trending",
    label: "Trending",
    description: "Rail of currently trending products.",
    isCustom: false,
    defaultSettings: {
      title: "", subtitle: "", productLimit: 8, mode: "auto", productIds: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasProductSelection: true,
    hasViewAllButton: true,
  },
  {
    key: "authenticity",
    label: "Authenticity / Why Choose Us",
    description: "Trust-building section — direct sourcing, authenticity guarantee, delivery promise.",
    isCustom: false,
    // The side photo was hardcoded to a stock image with no way to change it —
    // an odd thing to be stuck with on the section that argues you're the real
    // importer. Blank falls back to that original image.
    defaultSettings: { title: "", subtitle: "", image: "" },
    hasTitleSubtitle: true,
    hasImage: true,
  },
  {
    key: "testimonials",
    label: "Testimonials",
    description: "Real customer reviews pulled from your highest-rated products.",
    isCustom: false,
    defaultSettings: { title: "", subtitle: "", limit: 3 },
    hasTitleSubtitle: true,
  },
  {
    key: "recentlyViewed",
    label: "Recently Viewed",
    description: "Personalized rail — only shows once a visitor has viewed products this session.",
    isCustom: false,
    defaultSettings: { title: "" },
    hasTitleSubtitle: true,
  },
  {
    key: "blog",
    label: "Blog",
    description: "Latest blog posts preview.",
    isCustom: false,
    defaultSettings: {
      title: "", subtitle: "", postLimit: 3, mode: "auto", postSlugs: [],
      showViewAll: true, viewAllText: "", viewAllUrl: "",
    },
    hasTitleSubtitle: true,
    hasBlogSelection: true,
    hasViewAllButton: true,
  },
  {
    key: "instagram",
    label: "Instagram",
    description: "A link to your Instagram profile.",
    isCustom: false,
    // postLimit and images are gone with the grid — the section renders a
    // heading, a line of copy and one button, so there is nothing to count or
    // upload. Existing rows may still carry those keys in their stored settings;
    // they are simply ignored.
    defaultSettings: { title: "", subtitle: "", handle: "" },
    hasTitleSubtitle: true,
  },
  {
    key: "newsletter",
    label: "Newsletter",
    description: "Email signup banner.",
    isCustom: false,
    defaultSettings: { title: "", subtitle: "", buttonText: "", backgroundImage: "" },
    hasTitleSubtitle: true,
  },
  {
    // Template only — never rendered directly. Admin-created instances get their
    // own row with sectionKey `customBanner:<id>` (see CUSTOM_SECTION_PREFIXES and
    // POST /api/admin/homepage-sections). definitionFor() below prefix-matches any
    // such instance back to this entry, so it's freely duplicable/deletable while
    // every built-in section above stays a fixed singleton.
    key: "customBanner",
    label: "Custom Banner",
    description: "A standalone promotional banner — image, heading, and a call-to-action button.",
    isCustom: true,
    defaultSettings: { title: "", subtitle: "", image: "", buttonText: "", buttonUrl: "", textAlign: "left" },
  },
];

/** Repeatable custom section templates — a DB row's sectionKey is `${prefix}:${id}`
 * for one of these, letting many instances of the same template coexist despite
 * `sectionKey` being unique. Add a new entry here (+ its SECTION_DEFINITIONS template
 * + a renderer case in src/app/page.tsx) to offer another duplicable block type. */
export const CUSTOM_SECTION_PREFIXES = ["customBanner"];

export function definitionFor(key: string): SectionDefinition | undefined {
  const exact = SECTION_DEFINITIONS.find((d) => d.key === key);
  if (exact) return exact;
  const prefix = CUSTOM_SECTION_PREFIXES.find((p) => key.startsWith(`${p}:`));
  return prefix ? SECTION_DEFINITIONS.find((d) => d.key === prefix) : undefined;
}

export function parseSettings(raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
