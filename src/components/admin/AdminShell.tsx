"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Store } from "lucide-react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminUserMenu from "./AdminUserMenu";

interface NavItem {
  label: string;
  href: string;
  icon: "dashboard" | "products" | "orders" | "coupons" | "affiliates" | "support" | "inventory" | "homepage" | "content" | "categories" | "brands" | "reports";
  badge?: number;
}

export default function AdminShell({
  nav,
  userName,
  userRole,
  children,
}: {
  nav: NavItem[];
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-[18px]">
        <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={36} height={36} className="rounded-full ring-1 ring-white/15" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-cream">Seoul Glow</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-cream/45">Admin Panel</p>
        </div>
        <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="ml-auto text-cream/60 hover:text-cream md:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/35">Manage</p>
        <AdminSidebarNav items={nav} onNavigate={() => setMobileOpen(false)} />
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-cream/60 transition-colors hover:bg-white/[0.07] hover:text-cream"
        >
          <Store size={15} /> View storefront
        </Link>
        <AdminUserMenu userName={userName} userRole={userRole} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EF] md:grid md:grid-cols-[248px_1fr]">
      {/* Mobile top bar — desktop gets the always-visible sidebar instead */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-ink px-4 py-3 text-cream md:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="touch-target -ml-2">
          <Menu size={20} />
        </button>
        <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={26} height={26} className="rounded-full" />
        <p className="font-display text-base">Seoul Glow Admin</p>
      </div>

      {/* Desktop sidebar — sticky full-height so long tables scroll under it
          instead of scrolling the navigation off the top of the screen. */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-gradient-to-b from-ink to-[#241F1D] text-cream md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile off-canvas sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-fade-up" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[82vw] flex-col bg-gradient-to-b from-ink to-[#241F1D] text-cream shadow-e4">
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="min-w-0 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
