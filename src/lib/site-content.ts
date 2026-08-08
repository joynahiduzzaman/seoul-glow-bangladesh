// Single source of truth for every piece of admin-editable page copy on the
// storefront.
//
// HOW THIS WORKS
// --------------
// Each page declares its editable fields here, together with the value the site
// shipped with. `getPageContent()` (src/server/content.ts) merges whatever the
// admin has saved in the PageContent table on top of these defaults, so:
//   * a page with no saved row renders exactly as it always did, and
//   * adding a new field here is safe — existing rows simply fall back to the
//     new default until someone edits that page.
//
// The admin UI at /admin/content is fully generic: it renders whatever is
// declared below. Adding an editable field anywhere on the site is a one-entry
// change in this file plus reading it in the page component — no new admin
// screen, API route, or migration.
//
// DESIGN INTENT: content only. Nothing here controls layout, spacing, colour or
// component choice — the design stays fixed and the words/images change.

export type FieldType = "text" | "textarea" | "image" | "list";

/** A column inside a repeatable `list` row. Lists don't nest — one level is
 * enough for everything on the site and keeps the admin editor simple. */
export interface ItemFieldDef {
  key: string;
  label: string;
  type: Exclude<FieldType, "list">;
  hint?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  /** For `list` fields: the shape of each repeatable row. */
  itemFields?: ItemFieldDef[];
  /** Label used for the "Add" button on list fields, e.g. "Add question". */
  itemLabel?: string;
}

export interface FieldGroup {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface PageDef {
  key: string;
  label: string;
  /** Public URL, shown in the admin as a "view live" link. */
  path: string;
  description: string;
  /** Other routes that render this content and must be purged when it changes —
   *  `path` alone isn't enough for content that also appears elsewhere. Use a
   *  route pattern (`/blog/[slug]`) for dynamic segments, not a concrete URL. */
  alsoRevalidate?: string[];
  groups: FieldGroup[];
}

/** Any saved content blob: field key -> value (string, or rows for `list`). */
export type ContentValues = Record<string, string | Array<Record<string, string>>>;

// ---------------------------------------------------------------------------
// Global business information
// ---------------------------------------------------------------------------

/** Rendered in the footer, on the contact page, in the floating WhatsApp
 * button, and anywhere else the shop's own details appear. Kept separate from
 * the page list because it is cross-cutting rather than belonging to one page. */
export const BUSINESS_FIELDS: FieldGroup[] = [
  {
    title: "Contact Details",
    description: "Shown in the footer, on the Contact page, and on the floating WhatsApp button.",
    fields: [
      { key: "phone", label: "Phone / WhatsApp number", type: "text", hint: "Country code, digits only — e.g. 8801319453920" },
      { key: "email", label: "Email address", type: "text" },
      { key: "addressFull", label: "Full address", type: "textarea", hint: "Shown on the Contact page under the map." },
      { key: "addressShort", label: "Short address", type: "text", hint: "Compact version for the footer — e.g. Bashundhara, Dhaka, Bangladesh" },
      { key: "mapQuery", label: "Google Maps search text", type: "text", hint: "What the embedded map on the Contact page should centre on." },
    ],
  },
  {
    title: "Opening Hours",
    fields: [
      { key: "hoursPrimary", label: "Hours — first line", type: "text", hint: "e.g. Open 24/7" },
      { key: "hoursSecondary", label: "Hours — second line", type: "text", hint: "e.g. Every day of the week" },
      { key: "responseTime", label: "Typical response time", type: "text", hint: "e.g. Usually within a few hours" },
    ],
  },
  {
    title: "Social Profiles",
    fields: [
      { key: "facebookUrl", label: "Facebook page URL", type: "text" },
      { key: "instagramUrl", label: "Instagram profile URL", type: "text" },
      { key: "instagramHandle", label: "Instagram handle", type: "text", hint: "Without the @ — e.g. seoulglowbangladesh" },
    ],
  },
];

export const BUSINESS_DEFAULTS: Record<string, string> = {
  phone: "8801319453920",
  email: "seoulglow26@gmail.com",
  addressFull: "House 408, Road 8, Block D, Bashundhara Residential Area, Dhaka, Bangladesh",
  addressShort: "Bashundhara, Dhaka, Bangladesh",
  mapQuery: "House 408, Road 8, Block D, Bashundhara Residential Area, Dhaka, Bangladesh",
  hoursPrimary: "Open 24/7",
  hoursSecondary: "Every day of the week",
  responseTime: "Usually within a few hours",
  facebookUrl: "https://www.facebook.com/seoulglowbangladesh/",
  instagramUrl: "https://www.instagram.com/seoulglowbangladesh/",
  instagramHandle: "seoulglowbangladesh",
};

export type BusinessInfo = typeof BUSINESS_DEFAULTS;

// ---------------------------------------------------------------------------
// Per-page content
// ---------------------------------------------------------------------------

export const PAGE_DEFS: PageDef[] = [
  {
    key: "about",
    label: "About Us",
    path: "/about",
    description: "Story, mission, promise list and brand partners.",
    groups: [
      {
        title: "Hero Banner",
        fields: [
          { key: "heroEyebrow", label: "Eyebrow", type: "text" },
          { key: "heroTitle", label: "Headline", type: "text" },
          { key: "heroImage", label: "Background image", type: "image" },
        ],
      },
      {
        title: "Who We Are",
        fields: [
          { key: "storyEyebrow", label: "Eyebrow", type: "text" },
          { key: "storyTitle", label: "Heading", type: "text" },
          { key: "storyBody1", label: "Paragraph 1", type: "textarea" },
          { key: "storyBody2", label: "Paragraph 2", type: "textarea" },
          { key: "storyBody3", label: "Paragraph 3", type: "textarea" },
          { key: "storyImage", label: "Side image", type: "image" },
        ],
      },
      {
        title: "Our Promise",
        description: "The checklist shown beside the story.",
        fields: [
          {
            key: "promises",
            label: "Promise items",
            type: "list",
            itemLabel: "Add promise",
            itemFields: [{ key: "text", label: "Promise", type: "text" }],
          },
        ],
      },
      {
        title: "Why Korea",
        fields: [
          { key: "whyEyebrow", label: "Eyebrow", type: "text" },
          { key: "whyTitle", label: "Heading", type: "text" },
          {
            key: "whyItems",
            label: "Cards",
            type: "list",
            itemLabel: "Add card",
            itemFields: [
              { key: "title", label: "Card title", type: "text" },
              { key: "body", label: "Card text", type: "textarea" },
            ],
          },
        ],
      },
      {
        title: "Mission Quote",
        fields: [
          { key: "missionQuote", label: "Quote", type: "textarea" },
          { key: "missionAttribution", label: "Attribution", type: "text" },
        ],
      },
      {
        title: "Our Process",
        fields: [
          { key: "processEyebrow", label: "Eyebrow", type: "text" },
          { key: "processTitle", label: "Heading", type: "text" },
          {
            key: "processSteps",
            label: "Steps",
            type: "list",
            itemLabel: "Add step",
            itemFields: [
              { key: "title", label: "Step title", type: "text" },
              { key: "body", label: "Step text", type: "textarea" },
            ],
          },
        ],
      },
      {
        title: "Statistics Band",
        description: "Only claim figures the business can actually stand behind.",
        fields: [
          {
            key: "stats",
            label: "Stats",
            type: "list",
            itemLabel: "Add stat",
            itemFields: [
              { key: "value", label: "Value", type: "text", hint: "e.g. 100% or 12+" },
              { key: "label", label: "Label", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Closing Call to Action",
        fields: [
          { key: "ctaTitle", label: "Heading", type: "text" },
          { key: "ctaBody", label: "Supporting text", type: "textarea" },
          { key: "ctaButton", label: "Button label", type: "text" },
        ],
      },
    ],
  },

  {
    key: "contact",
    label: "Contact Us",
    path: "/contact",
    description: "Intro copy and the quick-answers accordion.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Message Form",
        fields: [
          { key: "formTitle", label: "Form heading", type: "text" },
          { key: "formNote", label: "Note under the heading", type: "textarea" },
        ],
      },
      {
        title: "Quick Answers",
        description: "The short FAQ shown at the bottom of the Contact page.",
        fields: [
          { key: "faqEyebrow", label: "Eyebrow", type: "text" },
          { key: "faqTitle", label: "Heading", type: "text" },
          {
            key: "faqs",
            label: "Questions",
            type: "list",
            itemLabel: "Add question",
            itemFields: [
              { key: "q", label: "Question", type: "text" },
              { key: "a", label: "Answer", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "faq",
    label: "FAQ",
    path: "/faq",
    description: "Every question in the help centre, grouped by category.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Questions",
        description:
          "Category must be one of: orders-shipping, payments, returns, authenticity, account.",
        fields: [
          {
            key: "entries",
            label: "Questions",
            type: "list",
            itemLabel: "Add question",
            itemFields: [
              { key: "category", label: "Category", type: "text" },
              { key: "q", label: "Question", type: "text" },
              { key: "a", label: "Answer", type: "textarea" },
            ],
          },
        ],
      },
      {
        title: "Closing Prompt",
        fields: [
          { key: "ctaTitle", label: "Heading", type: "text" },
          { key: "ctaBody", label: "Supporting text", type: "textarea" },
        ],
      },
    ],
  },

  {
    key: "shipping-policy",
    label: "Shipping Policy",
    path: "/shipping-policy",
    description: "Delivery zones, rates and the order journey.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Delivery Zones",
        description: "Display only. The fee actually charged at checkout comes from Shipping Zones in the code — keep the two in step.",
        fields: [
          {
            key: "zones",
            label: "Zones",
            type: "list",
            itemLabel: "Add zone",
            itemFields: [
              { key: "zone", label: "Zone name", type: "text" },
              { key: "fee", label: "Fee", type: "text", hint: "e.g. ৳70 flat" },
              { key: "time", label: "Delivery time", type: "text" },
              { key: "note", label: "Note", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Payment Note",
        fields: [
          { key: "codTitle", label: "Heading", type: "text" },
          { key: "codBody1", label: "Paragraph 1", type: "textarea" },
          { key: "codBody2", label: "Paragraph 2", type: "textarea" },
        ],
      },
      {
        title: "Order Journey",
        fields: [
          { key: "stepsEyebrow", label: "Eyebrow", type: "text" },
          { key: "stepsTitle", label: "Heading", type: "text" },
          {
            key: "steps",
            label: "Steps",
            type: "list",
            itemLabel: "Add step",
            itemFields: [
              { key: "title", label: "Step title", type: "text" },
              { key: "body", label: "Step text", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "refund-policy",
    label: "Return & Refund Policy",
    path: "/refund-policy",
    description: "Return conditions, the refund process and worked examples.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Conditions",
        fields: [
          {
            key: "conditions",
            label: "Conditions",
            type: "list",
            itemLabel: "Add condition",
            itemFields: [
              { key: "title", label: "Title", type: "text" },
              { key: "body", label: "Text", type: "textarea" },
            ],
          },
        ],
      },
      {
        title: "How It Works",
        fields: [
          { key: "stepsEyebrow", label: "Eyebrow", type: "text" },
          { key: "stepsTitle", label: "Heading", type: "text" },
          {
            key: "steps",
            label: "Steps",
            type: "list",
            itemLabel: "Add step",
            itemFields: [
              { key: "title", label: "Step title", type: "text" },
              { key: "body", label: "Step text", type: "textarea" },
            ],
          },
        ],
      },
      {
        title: "Examples",
        description: "Set Eligible to `yes` for a green card, anything else for a red one.",
        fields: [
          { key: "examplesEyebrow", label: "Eyebrow", type: "text" },
          { key: "examplesTitle", label: "Heading", type: "text" },
          {
            key: "examples",
            label: "Examples",
            type: "list",
            itemLabel: "Add example",
            itemFields: [
              { key: "eligible", label: "Eligible? (yes/no)", type: "text" },
              { key: "scenario", label: "Scenario", type: "text" },
              { key: "note", label: "Explanation", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "terms",
    label: "Terms & Conditions",
    path: "/terms",
    description: "Numbered legal sections.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Sections",
        description: "Rendered in order, with a sticky table of contents built from the titles.",
        fields: [
          {
            key: "sections",
            label: "Sections",
            type: "list",
            itemLabel: "Add section",
            itemFields: [
              { key: "title", label: "Section title", type: "text" },
              { key: "body", label: "Section text", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "privacy-policy",
    label: "Privacy Policy",
    path: "/privacy-policy",
    description: "Numbered privacy sections.",
    groups: [
      {
        title: "Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Heading", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Sections",
        fields: [
          {
            key: "sections",
            label: "Sections",
            type: "list",
            itemLabel: "Add section",
            itemFields: [
              { key: "title", label: "Section title", type: "text" },
              { key: "body", label: "Section text", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "blog",
    label: "Blog",
    path: "/blog",
    description: "Write and edit the journal articles, including each article's photo.",
    // An article shows up in three places: the journal index, its own page, and
    // the homepage's "Latest From the Journal" rail.
    alsoRevalidate: ["/blog/[slug]", "/"],
    groups: [
      {
        title: "Page Header",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Headline", type: "text" },
          { key: "intro", label: "Intro text", type: "textarea" },
        ],
      },
      {
        title: "Articles",
        description:
          "The newest article (by date) becomes the large featured card at the top of /blog. Categories are generated from whatever you type here — reuse the same spelling to group articles together.",
        fields: [
          {
            key: "posts",
            label: "Articles",
            type: "list",
            itemLabel: "Add article",
            itemFields: [
              { key: "title", label: "Title", type: "text" },
              {
                key: "slug",
                label: "URL slug",
                type: "text",
                hint: "The web address: /blog/your-slug. Lowercase letters, numbers and hyphens. Leave blank to build one from the title.",
              },
              { key: "image", label: "Article photo", type: "image" },
              { key: "excerpt", label: "Excerpt", type: "textarea", hint: "The one- or two-line summary on the article card." },
              { key: "category", label: "Category", type: "text", hint: "e.g. Routines, Ingredients, Guides" },
              { key: "author", label: "Author", type: "text" },
              { key: "date", label: "Date", type: "text", hint: "YYYY-MM-DD — this also decides the order articles appear in." },
              {
                key: "body",
                label: "Article text",
                type: "textarea",
                hint: "Leave a blank line between paragraphs.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getPageDef(key: string): PageDef | undefined {
  return PAGE_DEFS.find((p) => p.key === key);
}
