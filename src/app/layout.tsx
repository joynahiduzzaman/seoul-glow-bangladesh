import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import NavigationProgress from "@/components/NavigationProgress";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import BackToTopButton from "@/components/BackToTopButton";
import CartDrawer from "@/components/CartDrawer";
import CompareBar from "@/components/CompareBar";
import MessengerChat from "@/components/MessengerChat";
import ReferralCapture from "@/components/ReferralCapture";
import StorefrontChrome from "@/components/StorefrontChrome";
import { getBusinessInfo } from "@/server/content";
import { safeJsonLd } from "@/lib/utils";
import type { BusinessInfo } from "@/lib/site-content";
import Analytics from "@/components/Analytics";
import { Toaster } from "react-hot-toast";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Seoul Glow Bangladesh | Authentic Korean Skincare",
    template: "%s | Seoul Glow Bangladesh",
  },
  description:
    "Authentic Korean skincare imported directly from South Korea. Shop COSRX, Beauty of Joseon, Anua, SKIN1004, Laneige and more — delivered across Bangladesh.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Seoul Glow Bangladesh | Authentic Korean Skincare",
    description: "Authentic Korean skincare imported directly from South Korea.",
    url: siteUrl,
    siteName: "Seoul Glow Bangladesh",
    images: [{ url: "/logo.png", width: 1254, height: 1254 }],
    locale: "en_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seoul Glow Bangladesh | Authentic Korean Skincare",
    description: "Authentic Korean skincare imported directly from South Korea.",
    images: ["/logo.png"],
  },
};

// Organization/LocalBusiness structured data — real business info, used by search
// engines for knowledge-panel details (address, phone, hours, socials) rather than
// left for Google to guess at. Built from the admin-editable Business Info so the
// phone number Google shows can never drift from the one on the site itself.
function buildOrganizationJsonLd(business: BusinessInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Seoul Glow Bangladesh",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    image: `${siteUrl}/logo.png`,
    description:
      "Trusted Korean skincare importer bringing authentic, premium-quality beauty products directly from South Korea to customers across Bangladesh.",
    address: {
      "@type": "PostalAddress",
      streetAddress: business.addressFull,
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    telephone: `+${business.phone.replace(/\D/g, "")}`,
    email: business.email,
    openingHours: "Mo-Su 00:00-24:00",
    sameAs: [business.facebookUrl, business.instagramUrl].filter(Boolean),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const business = await getBusinessInfo();
  const organizationJsonLd = buildOrganizationJsonLd(business);

  return (
    <html lang={locale} className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }} />
        <Analytics />
        {/* Suspense: NavigationProgress reads useSearchParams, which opts its
            subtree into client rendering — without this boundary that would
            deopt every static page on the site. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ReferralCapture />
        <Toaster position="top-center" toastOptions={{ style: { fontSize: "14px" } }} />
        {/* Shop-only chrome — see StorefrontChrome for why the admin panel and
            print routes render without it. */}
        <StorefrontChrome>
          <Header locale={locale} dict={dict} />
        </StorefrontChrome>
        {/* A full-viewport floor, not 60vh: while a long page streams in, the
            browser paints whatever has parsed so far. At 60vh the footer landed
            around y=759 — inside the fold — was painted there, then shoved down
            as the rest of <main> arrived, costing ~0.166 CLS on the home page.
            Reserving a viewport keeps the footer below the fold until layout
            settles. Long pages are unaffected (they already exceed it); short
            ones simply get their footer pinned to the bottom instead of
            floating mid-screen. */}
        <main className="min-h-screen">{children}</main>
        <StorefrontChrome>
          <Footer locale={locale} dict={dict} />
          <WhatsAppButton />
          <BackToTopButton />
          <CartDrawer />
          <CompareBar />
          <MessengerChat />
        </StorefrontChrome>
      </body>
    </html>
  );
}
