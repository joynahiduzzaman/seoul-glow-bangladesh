"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the storefront chrome (announcement marquee, header, footer, cart
 * drawer, floating chat/back-to-top) everywhere EXCEPT the admin panel and the
 * print-document routes.
 *
 * Without this, `/admin` rendered the full customer storefront around the
 * dashboard — marquee and shop navigation above it, marketing footer and a
 * WhatsApp bubble below it — which both wasted a lot of vertical space and made
 * the admin read as a page on the shop rather than a tool.
 *
 * Implemented as a client-side path check rather than by reading `headers()` in
 * the root layout, because touching `headers()` there would opt every route in
 * the app (including the statically generated blog pages) into dynamic
 * rendering. `usePathname()` is available during SSR in the App Router, so the
 * server-rendered HTML already excludes the chrome — there's no flash of it on
 * first paint.
 */
export default function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAdminSurface =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/admin-print/") ||
    pathname.startsWith("/admin-preview-frame");

  if (isAdminSurface) return null;
  return <>{children}</>;
}
