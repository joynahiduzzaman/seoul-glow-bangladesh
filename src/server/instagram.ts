/**
 * Live Instagram feed via the Instagram Graph API.
 *
 * Two things constrain what is possible here, and both are Meta's:
 *
 * 1. The Instagram Basic Display API — the old, easy path that needed only a
 *    personal account — was shut down on 4 December 2024. It is not coming back.
 * 2. What remains is the Graph API, which requires an Instagram Business or
 *    Creator account linked to a Facebook Page, inside a Meta app that has
 *    cleared review. There is no unauthenticated way to read a public profile;
 *    scraping the website violates Meta's terms and breaks without warning.
 *
 * So this is credential-gated like every other integration in the project: with
 * no token it returns null and the section renders a link to the profile rather
 * than inventing content. Nothing here throws — a social widget must never be
 * able to take down the homepage.
 */

export interface InstagramPost {
  id: string;
  caption: string | null;
  mediaUrl: string;
  permalink: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
}

/** One hour: fresh enough for a storefront, far below any rate limit. */
export const INSTAGRAM_REVALIDATE_SECONDS = 3600;

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim() && process.env.INSTAGRAM_USER_ID?.trim());
}

/** Names of the missing variables — never their values. */
export function missingInstagramVars(): string[] {
  return (["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_USER_ID"] as const).filter(
    (k) => !process.env[k]?.trim()
  );
}

/**
 * Latest posts, or null when the feed cannot be produced. Null is a normal
 * outcome — unconfigured, expired token, Meta outage — and the caller renders
 * the fallback for all of them.
 */
export async function getInstagramPosts(limit = 6): Promise<InstagramPost[] | null> {
  if (!isInstagramConfigured()) return null;

  const userId = process.env.INSTAGRAM_USER_ID!.trim();
  const token = process.env.INSTAGRAM_ACCESS_TOKEN!.trim();
  const fields = "id,caption,media_url,thumbnail_url,permalink,media_type,timestamp";
  const url =
    `https://graph.instagram.com/v21.0/${encodeURIComponent(userId)}/media` +
    `?fields=${fields}&limit=${Math.min(Math.max(limit, 1), 25)}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      // Cached by Next, so a homepage render does not hit Meta on every request.
      next: { revalidate: INSTAGRAM_REVALIDATE_SECONDS, tags: ["instagram-feed"] },
    });

    if (!res.ok) {
      // Meta returns the reason as JSON; surface it in logs so an expired token
      // is distinguishable from an outage without guesswork.
      const detail = await res.text().catch(() => "");
      console.error(`[instagram] feed request failed: HTTP ${res.status}`, detail.slice(0, 300));
      return null;
    }

    const json = await res.json();
    if (!Array.isArray(json?.data)) {
      console.error("[instagram] unexpected response shape:", JSON.stringify(json).slice(0, 200));
      return null;
    }

    return json.data
      .map((item: Record<string, unknown>): InstagramPost | null => {
        // A VIDEO item has no media_url usable as a still; thumbnail_url is the
        // poster frame. Skip anything with neither rather than render a break.
        const mediaUrl =
          (item.media_type === "VIDEO" ? (item.thumbnail_url as string) : (item.media_url as string)) ??
          (item.thumbnail_url as string);
        if (!mediaUrl || !item.permalink) return null;

        return {
          id: String(item.id),
          caption: (item.caption as string) ?? null,
          mediaUrl,
          permalink: String(item.permalink),
          mediaType: (item.media_type as InstagramPost["mediaType"]) ?? "IMAGE",
          timestamp: String(item.timestamp ?? ""),
        };
      })
      .filter((p: InstagramPost | null): p is InstagramPost => p !== null)
      .slice(0, limit);
  } catch (err) {
    // Network failure, DNS, timeout — all end up here, and all mean "no feed".
    console.error("[instagram] feed fetch threw:", err);
    return null;
  }
}
