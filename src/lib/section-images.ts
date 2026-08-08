/** The stock photo the Authenticity section shipped with. Only used until an
 *  admin uploads their own — a shop selling its own authenticity should be able
 *  to show its own shelf. */
export const DEFAULT_AUTHENTICITY_IMAGE =
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80";

/**
 * Resolve a section's photos from settings that may predate the swipe.
 *
 * `images` (a list) replaced `image` (one string) when the panel became
 * swipeable. Sections saved before that still carry only the single key, so it
 * is read as the first photo — an existing section keeps its picture without
 * anyone having to re-save it. Blanks are dropped rather than rendered as an
 * empty slide, which is what an admin who cleared one field would otherwise get.
 */
export function resolveAuthenticityImages(images?: string[], image?: string): string[] {
  const list = (images || []).map((s) => (s || "").trim()).filter(Boolean);
  if (list.length > 0) return list;
  const single = (image || "").trim();
  return [single || DEFAULT_AUTHENTICITY_IMAGE];
}
