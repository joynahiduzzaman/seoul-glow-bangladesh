import { prisma } from "./db";

/**
 * Instagram feed — one interface, swappable source.
 *
 * The Graph API is unavailable: its predecessor, the Basic Display API, was shut
 * down on 4 December 2024, and what replaced it requires a Business account
 * inside a Meta app that has cleared review, which this one has not. So posts
 * are curated by hand in Admin → Instagram Feed and read from the database.
 *
 * The shape returned here is deliberately the same one the Graph API produces,
 * so switching later means replacing the body of getInstagramPosts and nothing
 * else — the homepage component, its loading state and its empty state all stay
 * as they are. See getInstagramPostsFromApi below for the seam.
 */

export interface InstagramPost {
  id: string;
  imageUrl: string;
  postUrl: string;
  caption: string | null;
}

/** Where the feed currently comes from. Flip to "api" once Meta approves. */
export const INSTAGRAM_SOURCE: "manual" | "api" = "manual";

/**
 * Latest posts for the homepage grid, or null when the feed cannot be produced.
 *
 * Null is a normal outcome — no posts curated yet, or a database hiccup — and
 * the caller renders the follow CTA for both. Nothing here throws: a social
 * widget must never be able to take down a storefront.
 */
export async function getInstagramPosts(limit = 4): Promise<InstagramPost[] | null> {
  try {
    if (INSTAGRAM_SOURCE === "api") return await getInstagramPostsFromApi(limit);

    const rows = await prisma.instagramPost.findMany({
      // imageUrl guard as well as enabled: a seeded post awaiting its
      // thumbnail would otherwise render an empty tile.
      where: { enabled: true, imageUrl: { not: "" } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 12),
      select: { id: true, imageUrl: true, postUrl: true, caption: true },
    });

    return rows.length > 0 ? rows : null;
  } catch (err) {
    console.error("[instagram] failed to load posts:", err);
    return null;
  }
}

/**
 * The Graph API implementation, kept ready but unused.
 *
 * Requires INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID, an Instagram Business
 * or Creator account linked to a Facebook Page, and an approved Meta app. To
 * switch: set those variables and change INSTAGRAM_SOURCE to "api". Note that
 * long-lived tokens expire after 60 days and need refreshing.
 */
async function getInstagramPostsFromApi(limit: number): Promise<InstagramPost[] | null> {
  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!userId || !token) return null;

  const fields = "id,caption,media_url,thumbnail_url,permalink,media_type";
  const url =
    `https://graph.instagram.com/v21.0/${encodeURIComponent(userId)}/media` +
    `?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  try {
    // Cached by Next so a homepage render does not call Meta per visitor.
    const res = await fetch(url, { next: { revalidate: 3600, tags: ["instagram-feed"] } });
    if (!res.ok) {
      console.error(`[instagram] API request failed: HTTP ${res.status}`, (await res.text().catch(() => "")).slice(0, 200));
      return null;
    }
    const json = await res.json();
    if (!Array.isArray(json?.data)) return null;

    return json.data
      .map((item: Record<string, unknown>): InstagramPost | null => {
        // A video has no still in media_url; thumbnail_url is the poster frame.
        const imageUrl =
          (item.media_type === "VIDEO" ? (item.thumbnail_url as string) : (item.media_url as string)) ??
          (item.thumbnail_url as string);
        if (!imageUrl || !item.permalink) return null;
        return {
          id: String(item.id),
          imageUrl,
          postUrl: String(item.permalink),
          caption: (item.caption as string) ?? null,
        };
      })
      .filter((p: InstagramPost | null): p is InstagramPost => p !== null);
  } catch (err) {
    console.error("[instagram] API fetch threw:", err);
    return null;
  }
}
