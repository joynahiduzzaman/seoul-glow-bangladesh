"use client";

import Link from "next/link";
import BrandLogo from "./BrandLogo";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Heart, User, ShoppingBag, Menu, X, PackageSearch } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import LanguageSwitcher from "./LanguageSwitcher";
import Marquee from "./Marquee";
import SearchOverlay from "./SearchOverlay";
import MegaMenu from "./MegaMenu";
import AccountMenu, { type SessionUser } from "./AccountMenu";
import NotificationBell from "./NotificationBell";

const BRAND_LINKS = [
  { label: "COSRX", href: "/brands/cosrx" },
  { label: "Beauty of Joseon", href: "/brands/beauty-of-joseon" },
  { label: "Anua", href: "/brands/anua" },
  { label: "SKIN1004", href: "/brands/skin1004" },
  { label: "Round Lab", href: "/brands/round-lab" },
  { label: "Laneige", href: "/brands/laneige" },
];

const CATEGORY_LINKS = [
  { label: "Cleanser", href: "/shop?category=cleanser" },
  { label: "Toner", href: "/shop?category=toner" },
  { label: "Serum", href: "/shop?category=serum" },
  { label: "Sunscreen", href: "/shop?category=sunscreen" },
  { label: "Moisturizer", href: "/shop?category=moisturizer" },
  { label: "Masks", href: "/shop?category=masks" },
];

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  // The staff shortcut now lives inside AccountMenu, which already has the role.
  const isAuthed = Boolean(user);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const openCart = useCartStore((s) => s.openCart);

  // The cart count is read from localStorage (via zustand persist), which doesn't exist
  // on the server. Rendering `totalItems` straight away means the client's first paint
  // (already rehydrated from localStorage) mismatches the server-rendered "0 items"
  // markup, so React throws a hydration error and force-renders the whole page client-side.
  // Gating the badge behind `mounted` keeps the first client render identical to the
  // server's, then reveals the real count once hydration is safely done.
  useEffect(() => {
    setMounted(true);
  }, []);

  const NAV_LINKS = [
    { label: dict.nav.shopAll, href: "/shop" },
    { label: dict.nav.bestSellers, href: "/shop?filter=bestseller" },
    { label: dict.nav.newArrivals, href: "/shop?filter=new" },
    { label: dict.nav.flashSale, href: "/shop?filter=flashsale" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ROOT-CAUSE FIX: Header lives in the root layout and is never unmounted during
  // client-side navigation (App Router). A one-time mount check here would freeze
  // `isAuthed` at whatever it was when the app first loaded — so logging in via
  // `router.push()` (client-side navigation, no full page reload) would leave the
  // header still believing you're a guest, sending the profile icon back to /login
  // and looking exactly like an immediate logout. Re-checking on every pathname
  // change catches the moment right after login (or logout) actually navigates.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        // Only the fields the header renders are kept — the endpoint returns the
        // whole (password-stripped) record, and there is no reason to hold the
        // rest in client state.
        setUser(
          d.user
            ? { id: d.user.id, name: d.user.name, email: d.user.email, role: d.user.role }
            : null
        );
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <>
      <div className="hidden md:block bg-ink text-cream py-2">
        <Marquee
          items={[
            dict.nav.announcement,
            "New arrivals every week · 100% Authentic",
            "Cash on Delivery available nationwide",
          ]}
        />
      </div>
      <header className="sticky top-0 z-50 safe-top">
        <div
          // Vertical padding is trimmed in step with the larger mark so the
          // header's overall height is unchanged: at rest it was 50px logo +
          // 2×16px padding = 82px on desktop, and is now 64px + 2×9px = 82px.
          // On mobile the 44px touch targets set the floor, so 48px + 2×8px
          // holds the same 64px as before.
          className={`transition-all duration-500 ${
            scrolled
              ? "mx-3 md:mx-6 mt-3 rounded-xl2 glass shadow-glass border border-border-soft/60 py-2 md:py-1"
              : "bg-cream/90 backdrop-blur-sm border-b border-border-soft/70 py-[7px] md:py-[9px]"
          }`}
        >
        {/* gap-2 on a phone: with the notification bell added, a 24px gap between
            the menu button, the mark and the icon cluster pushed the row 10px
            past a 320px screen. justify-between still does the spacing wherever
            there is room. */}
        <div className="container-px mx-auto flex items-center justify-between gap-2 sm:gap-6">
          <button
            className="lg:hidden touch-target -ml-2.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* aria-label rather than relying on the wordmark: that text is
              `hidden sm:flex`, so on phones the link would otherwise have no
              accessible name at all. */}
          <Link
            href="/"
            aria-label="Seoul Glow Bangladesh — home"
            className="group flex items-center gap-4 shrink-0 md:gap-5"
          >
            <BrandLogo
              className={`transition-all duration-300 ease-silk group-hover:shadow-e2 ${
                scrolled ? "h-11 w-11 md:h-[50px] md:w-[50px]" : "h-[50px] w-[50px] md:h-16 md:w-16"
              }`}
            />
            {/* Optical alignment: the display line sits slightly high against a
                circular mark because of its ascenders, so the caption carries a
                touch more leading to bring the pair's visual centre onto the
                mark's centre. */}
            <span className="hidden sm:flex flex-col justify-center leading-none">
              <span className="font-display text-[26px] font-semibold text-ink tracking-wide">Seoul Glow</span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.28em] text-rose-gold-text">Bangladesh</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            <MegaMenu
              label={dict.nav.brands}
              triggerHref="/brands"
              links={BRAND_LINKS}
              image="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=500&q=80"
              caption="Direct from South Korea's most-loved skincare labels."
              // Pointed at /shop, so a button reading "All Brands" dropped the
              // visitor on the unfiltered product grid — the brand directory it
              // promises now exists, so it goes there.
              ctaLabel="View All Brands"
              ctaHref="/brands"
            />
            <MegaMenu
              label={dict.nav.skincare}
              // Was /shop?category=serum, so the "Skincare" heading opened
              // serums only, and its "Shop All Skincare" button opened the
              // unfiltered product grid. Both now open the category directory.
              triggerHref="/categories"
              links={CATEGORY_LINKS}
              image="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=80"
              caption="Build your routine, one step at a time."
              ctaLabel="View All Categories"
              ctaHref="/categories"
            />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-ink/80 hover:text-rose-gold-text transition-colors py-2 group"
              >
                {link.label}
                <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-rose-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
            <div className="hidden xl:block">
              <LanguageSwitcher locale={locale} />
            </div>
            <SearchOverlay label={dict.nav.search} />
            {/* Permanent, no-login-required entry point to /track-order — a guest
                who placed an order and left the site otherwise has no way back to
                it once the checkout-success page is gone. Kept as an icon (not a
                nav text link) so it doesn't reintroduce the tablet-width overflow
                that the nav row hit earlier; a title attribute gives desktop
                mouse users a tooltip on top of the aria-label. */}
            <Link
              href="/track-order"
              aria-label={dict.nav.trackOrder}
              title={dict.nav.trackOrder}
              className="hidden sm:flex touch-target hover:text-rose-gold transition-colors active:scale-95"
            >
              <PackageSearch size={20} />
            </Link>
            <Link href="/account/wishlist" aria-label={dict.nav.wishlist} className="hidden sm:flex touch-target hover:text-rose-gold transition-colors active:scale-95">
              <Heart size={20} />
            </Link>
            {/* Signed in: the bell and the customer's own identity. Signed out:
                the plain link to /login exactly as before, so nothing about the
                guest header changes. `user` is null until /api/auth/me answers,
                so the first paint is the guest state either way. */}
            {isAuthed && <NotificationBell />}
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <Link
                href="/login"
                aria-label={dict.nav.account}
                className="touch-target hover:text-rose-gold transition-colors active:scale-95"
              >
                <User size={20} />
              </Link>
            )}
            <button
              onClick={openCart}
              aria-label={mounted && totalItems > 0 ? `${dict.nav.cart} (${totalItems})` : dict.nav.cart}
              className="relative touch-target hover:text-rose-gold transition-colors active:scale-95"
            >
              <ShoppingBag size={20} />
              {mounted && totalItems > 0 && (
                // min-w + px rather than a fixed 16px square: a double-digit count
                // overflowed the old circle. Caps at "9+" so the badge never grows
                // wide enough to crowd the icon.
                <span className="absolute top-1.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-gold px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-cream">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden container-px pb-4 flex flex-col bg-cream divide-y divide-border-soft/70 max-h-[calc(100vh-5rem)] overflow-y-auto animate-fade-up">
            <Link href="/brands" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink/80 py-3.5">
              {dict.nav.brands}
            </Link>
            {/* Also pointed at serums, so "Skincare" on a phone opened one
                category rather than the list of them. */}
            <Link href="/categories" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink/80 py-3.5">
              {dict.nav.skincare}
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-[15px] font-medium text-ink/80 py-3.5"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/track-order" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[15px] font-medium text-ink/80 py-3.5">
              <PackageSearch size={16} /> {dict.nav.trackOrder}
            </Link>
            <Link href="/account/wishlist" onClick={() => setMenuOpen(false)} className="sm:hidden flex items-center gap-2 text-[15px] font-medium text-ink/80 py-3.5">
              <Heart size={16} /> {dict.nav.wishlist}
            </Link>
            <div className="pt-3.5">
              <LanguageSwitcher locale={locale} />
            </div>
          </nav>
        )}
        </div>
      </header>
    </>
  );
}
