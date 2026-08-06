"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Gift,
  LifeBuoy,
  Boxes,
  LayoutTemplate,
  FileText,
  Instagram,
  type LucideIcon,
} from "lucide-react";

// Icon components live only here, on the client side — same reasoning as
// AccountSidebarNav: a server layout can't pass component references as props
// to a "use client" component, so it hands us string keys instead.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: Package,
  orders: ShoppingCart,
  coupons: Tag,
  affiliates: Gift,
  support: LifeBuoy,
  inventory: Boxes,
  homepage: LayoutTemplate,
  content: FileText,
  instagram: Instagram,
};

interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

export default function AdminSidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-200 ease-silk ${
              isActive
                ? "bg-gradient-to-r from-rose-gold/25 to-rose-gold/[0.08] font-medium text-cream shadow-e1"
                : "text-cream/65 hover:bg-white/[0.07] hover:text-cream"
            }`}
          >
            {/* Active rail — the standard Linear/Vercel cue for "you are here",
                clearer at a glance than a background tint alone. */}
            {isActive && (
              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-rose-gold" aria-hidden="true" />
            )}
            <span className="flex items-center gap-3">
              <Icon
                size={16}
                className={`transition-colors ${isActive ? "text-rose-gold-light" : "text-cream/45 group-hover:text-cream/80"}`}
              />
              {item.label}
            </span>
            {!!item.badge && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-gold px-1.5 text-[10px] font-semibold text-white shadow-e1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
