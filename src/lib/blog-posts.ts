export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  category: string;
  date: string; // ISO date
  content: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "10-step-korean-skincare-routine-explained",
    title: "The 10-Step Korean Skincare Routine, Explained",
    excerpt: "A practical, no-fluff breakdown of each step and why it matters for humid Bangladeshi weather.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80",
    author: "Seoul Glow Editorial",
    category: "Routines",
    date: "2026-06-02",
    content: [
      "The famous \"10-step\" Korean routine sounds intimidating, but it's really just a logical order: thinnest, wateriest products first, richest and heaviest last. You don't need all 10 steps every day — most people get excellent results from 4 to 6 of them.",
      "In Dhaka's humidity, the order matters even more than in a dry climate. Start with an oil cleanser to dissolve sunscreen and sebum, follow with a gentle water-based cleanser, then a low-pH toner to rebalance skin after cleansing.",
      "From there: essence (hydration and active ingredients in one light layer), serum or ampoule for targeted concerns like brightening or acne, then a lightweight moisturizer. In humid weather, skip heavy creams during the day — save them for night.",
      "The step people skip most, and shouldn't: sunscreen. Reapply every 2–3 hours if you're outdoors, since UV exposure is intense year-round in Bangladesh.",
    ],
  },
  {
    slug: "centella-vs-snail-mucin",
    title: "Centella vs Snail Mucin: Which Should You Choose?",
    excerpt: "Two K-beauty superstar ingredients compared for sensitive and acne-prone skin.",
    image: "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?auto=format&fit=crop&w=1200&q=80",
    author: "Seoul Glow Editorial",
    category: "Ingredients",
    date: "2026-05-18",
    content: [
      "Centella Asiatica (often labeled \"cica\") and snail mucin are the two ingredients you'll see most often in Korean skincare aisles — and for good reason. Both calm irritation and support the skin barrier, but they're not interchangeable.",
      "Centella is the better choice if your main concern is redness, sensitivity, or a compromised barrier from over-exfoliating. It's anti-inflammatory and generally very well tolerated, even on active breakouts.",
      "Snail mucin leans more toward hydration and repair — it's popular for fading acne marks and improving overall skin texture over time, but can feel slightly tackier on the skin in humid weather.",
      "If you have to pick one for Bangladesh's climate: start with Centella. It layers lighter under sunscreen and makeup, and works well even in peak humidity.",
    ],
  },
  {
    slug: "how-to-layer-serums-without-wasting-product",
    title: "How to Layer Serums Without Wasting Product",
    excerpt: "The right order, timing, and quantity for essences, serums, and ampoules.",
    image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80",
    author: "Seoul Glow Editorial",
    category: "Routines",
    date: "2026-04-27",
    content: [
      "A common mistake: applying three serums at once, all in a thick layer, and wondering why nothing seems to absorb. The rule of thumb is thinnest-to-thickest, with a short wait between layers — 30–60 seconds is usually enough.",
      "Ampoules are more concentrated than serums and are meant to be used in smaller amounts — a few drops go a long way. Save your priciest ampoule for the layer right after toner, when skin absorbs the most.",
      "Not every active needs to go on every day. Alternate brightening and exfoliating actives with calming ones (like Centella) so your skin barrier gets a break — especially important if you're also using sunscreen daily, which most of Bangladesh's climate demands.",
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getCategories() {
  return Array.from(new Set(BLOG_POSTS.map((p) => p.category)));
}

/** ~200 words/minute, rounded up to a whole minute, minimum 1. */
export function getReadingTime(post: BlogPost) {
  const words = post.content.join(" ").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getRelatedPosts(post: BlogPost, limit = 3) {
  const sameCategory = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category === post.category);
  const rest = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
