"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUpDown, LogOut, Store, User, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/** Colour-codes the role chip so ADMIN/MANAGER/STAFF are distinguishable at a
 * glance rather than reading as identical grey text. */
const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-rose-gold/15 text-rose-gold-light ring-rose-gold/25",
  MANAGER: "bg-badge-coupon/15 text-[#7FA8F0] ring-badge-coupon/25",
  STAFF: "bg-success/15 text-[#7DBF9B] ring-success/25",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Sidebar account control — replaces the previous plain "Signed in as X" line
 * plus a bare sign-out button. Behaves like the workspace switcher in Linear /
 * Vercel: a single tappable identity row that opens a small menu.
 */
export default function AdminUserMenu({ userName, userRole }: { userName: string; userRole: string }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Same request the previous LogoutButton made — only the presentation changed.
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  const roleChip = ROLE_STYLES[userRole] || "bg-cream/10 text-cream/70 ring-cream/15";

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
            role="menu"
            className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl2 border border-white/10 bg-[#3A3330] shadow-e4"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-medium text-cream">{userName || "Store Admin"}</p>
              <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${roleChip}`}>
                <ShieldCheck size={10} /> {userRole || "STAFF"}
              </span>
            </div>

            <div className="p-1.5">
              <Link
                href="/account/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-cream/75 transition-colors hover:bg-white/10 hover:text-cream"
              >
                <User size={15} /> My profile
              </Link>
              <Link
                href="/"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-cream/75 transition-colors hover:bg-white/10 hover:text-cream"
              >
                <Store size={15} /> View storefront
              </Link>
            </div>

            <div className="border-t border-white/10 p-1.5">
              <button
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#FF8FA3] transition-colors hover:bg-badge-sale/15 disabled:opacity-60"
              >
                {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-white/10 px-2.5 py-2.5 text-left transition-colors ${
          open ? "bg-white/10" : "hover:bg-white/[0.07]"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-gold to-rose-gold-light text-[11px] font-bold text-white">
          {initialsOf(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-cream">{userName || "Store Admin"}</span>
          <span className="block truncate text-[10px] uppercase tracking-wide text-cream/45">{userRole || "STAFF"}</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-cream/55" />
      </button>
    </div>
  );
}
