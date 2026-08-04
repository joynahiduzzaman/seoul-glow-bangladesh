"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  User,
  Heart,
  Clock,
  Gift,
  MapPin,
  Ticket,
  Bell,
  LifeBuoy,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import SignOutButton from "@/components/account/SignOutButton";

// Icon components live only here, on the client side. The server layout hands us
// string keys (serializable across the Server → Client boundary) instead of the
// component references themselves — React Server Components cannot pass functions
// as props to a "use client" component, which is what was crashing this page.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: Package,
  wishlist: Heart,
  recentlyViewed: Clock,
  addresses: MapPin,
  coupons: Ticket,
  notifications: Bell,
  support: LifeBuoy,
  referrals: Gift,
  profile: User,
  admin: ShieldCheck,
  settings: Settings,
};

interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
}

export default function AccountSidebarNav({ items, signOutLabel }: { items: NavItem[]; signOutLabel: string }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        // Exact match for the dashboard root; startsWith for everything else so a
        // sub-route like /account/orders/abc123 still highlights "My Orders".
        const isActive = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
              isActive ? "bg-rose-gold/10 text-rose-gold-text font-medium" : "text-ink/70 hover:bg-beige/60 hover:text-ink"
            }`}
          >
            <Icon size={16} /> {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border-soft" />

      <SignOutButton label={signOutLabel} />
    </>
  );
}
