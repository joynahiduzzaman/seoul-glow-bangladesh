"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { User, Package, Heart, Settings, MapPin, LogOut, Loader2, ShieldCheck, ChevronDown } from "lucide-react";
import UserAvatar from "./UserAvatar";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Present once a profile photo is on file; social accounts supply one. */
  image?: string | null;
}

const LINKS = [
  { href: "/account", label: "My Account", Icon: User },
  { href: "/account/orders", label: "My Orders", Icon: Package },
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account/addresses", label: "Addresses", Icon: MapPin },
  { href: "/account/settings", label: "Account Settings", Icon: Settings },
];

/**
 * The signed-in customer's identity in the header, replacing the generic person
 * icon. Signed-out visitors never reach this component — the header keeps the
 * plain link to /login for them, so nothing about the guest header changes.
 *
 * Session comes from the existing /api/auth/me cookie session that the header
 * already reads; this introduces no second source of truth and no new auth.
 */
export default function AccountMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "Account";

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // The existing route clears both auth cookies server-side.
      await fetch("/api/auth/logout", { method: "POST" });
      setOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    // Static below sm for the same reason as the notification panel: anchoring
    // the dropdown to the sticky <header> keeps it inside the screen no matter
    // how wide it grows, where anchoring to the avatar does not.
    <div ref={ref} className="static sm:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        // Compact by design: the avatar is the same 32px as the other header
        // icons' tap targets, so adding an identity here does not make the bar
        // any taller. The name only appears where there is room for it.
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-beige/70 lg:pr-2.5"
      >
        <UserAvatar name={user.name} email={user.email} image={user.image} size={32} />
        <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink lg:block">{firstName}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`hidden text-ink/40 transition-transform duration-300 lg:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            role="menu"
            aria-label="Account"
            // Capped against the viewport so it can never sit outside the screen
            // on a narrow phone.
            className="absolute right-3 sm:right-0 z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e4"
          >
            <div className="flex items-center gap-3 border-b border-border-soft bg-gradient-to-br from-beige/60 to-soft-pink/30 px-4 py-3.5">
              <UserAvatar name={user.name} email={user.email} image={user.image} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-ink">{user.name}</p>
                <p className="truncate text-xs leading-tight text-body">{user.email}</p>
              </div>
            </div>

            <nav className="py-1.5">
              {isStaff && (
                <Link
                  href="/admin"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-gold-text transition-colors hover:bg-beige/70"
                >
                  <ShieldCheck size={16} aria-hidden="true" /> Admin Dashboard
                </Link>
              )}
              {LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 transition-colors hover:bg-beige/70 hover:text-ink"
                >
                  <Icon size={16} aria-hidden="true" className="text-ink/45" /> {label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-border-soft p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} aria-hidden="true" />}
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
