/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// CRITICAL: Next.js dev mode (`npm run dev`) uses eval()-wrapped modules for Hot Module
// Replacement / Fast Refresh. A CSP without 'unsafe-eval' silently blocks ALL of that in
// the browser — meaning NO client-side JavaScript executes at all in dev mode. Every
// button, form, and click handler on the site would appear completely dead (while the
// page still looks fully rendered, since that part is plain server-rendered HTML that
// doesn't need JS). This is why CSP is standard practice to relax or skip in development
// and only enforce strictly in production, where Next.js ships a real bundle with no eval.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://analytics.tiktok.com https://connect.facebook.net",
  // google.com/maps is here for the embedded location map on /contact — without
  // it the CSP blocks the iframe and the contact page shows an empty grey box.
  "frame-src 'self' https://www.facebook.com https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Product images uploaded through the admin panel are served from
      // Cloudinary. Without this entry next/image refuses the host outright and
      // every uploaded image renders as a broken placeholder.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async redirects() {
    return [
      {
        // /brands/[slug] pages exist, so users and crawlers naturally truncate
        // to the parent /brands — which had no page and returned a 404. The
        // canonical brand index is the Shop page's brand view; point there
        // permanently rather than adding a duplicate listing to maintain.
        source: "/brands",
        destination: "/shop?view=brands",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Applies to every route — standard hardening headers.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
