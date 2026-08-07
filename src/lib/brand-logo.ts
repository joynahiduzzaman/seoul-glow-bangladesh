/**
 * Normalises a brand logo for display in a fixed frame.
 *
 * Brand logo files carry wildly different amounts of built-in transparent
 * margin — the twelve on file are all delivered as squares or near-squares, but
 * once that margin is removed the actual artwork ranges from 1.2:1 to 6.2:1.
 * Rendering them as-is means `object-contain` scales each mark to its *file*
 * rather than to the logo inside it, so a wordmark with a generous canvas looks
 * timid next to a tightly-cropped one and the brand wall reads as sloppy.
 *
 * Cloudinary's `e_trim` crops that surrounding margin at delivery time, so every
 * mark arrives tight to its own ink and the frame does the sizing. Files hosted
 * anywhere else are returned untouched — the transformation is only meaningful
 * on a Cloudinary delivery URL.
 *
 * The tolerance (10) is deliberately not 0: these are lossy-edged PNGs, and an
 * exact-match trim leaves a rim of near-transparent pixels behind, which defeats
 * the point.
 */
const TRIM = "e_trim:10";

export function trimmedLogoUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  // Never stack the transformation if a stored URL already carries it.
  if (url.includes(TRIM)) return url;
  return url.replace("/upload/", `/upload/${TRIM}/`);
}
