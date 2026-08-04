/**
 * The canonical public origin of this site, with no trailing slash.
 *
 * Five separate modules previously carried their own
 * `process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"`. That fallback is
 * fine locally but dangerous in production: if the variable is ever missing from
 * the deployment, robots.txt, the sitemap, canonical tags and Open Graph URLs all
 * quietly advertise `localhost:3000` to search engines. Falling back to Vercel's
 * own production domain keeps those correct even when the explicit variable is
 * absent, and localhost is reached only when nothing else identifies the host.
 *
 * Note the deliberate use of the *production* domain rather than VERCEL_URL:
 * VERCEL_URL is unique per deployment, so canonical URLs built from it would
 * point at a frozen old build after the next push.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  // Vercel system variables. The NEXT_PUBLIC_ copy exists only when "Automatically
  // expose System Environment Variables" is enabled; the bare one is server-side.
  const vercelProd =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL for a site-relative path, e.g. absoluteUrl("/shop"). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
