import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import AccountShell from "@/components/account/AccountShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");
  const dict = getDictionary(getLocale());

  // Icon keys only — the actual lucide-react components are resolved inside
  // AccountSidebarNav (a client component). Passing the component references
  // themselves from this server layout would crash the page: React Server
  // Components can't pass functions as props across the server/client boundary.
  const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);

  const NAV = [
    // Staff-only shortcut back to /admin — customers never see this. Kept as
    // the first item so it's the fastest thing to reach from any account page.
    ...(isStaff ? [{ label: "Admin Dashboard", href: "/admin", icon: "admin" as const }] : []),
    { label: dict.account.dashboard, href: "/account", icon: "dashboard" as const },
    { label: dict.account.myOrders, href: "/account/orders", icon: "orders" as const },
    { label: dict.account.wishlist, href: "/account/wishlist", icon: "wishlist" as const },
    { label: dict.account.recentlyViewed, href: "/account/recently-viewed", icon: "recentlyViewed" as const },
    { label: dict.account.addresses, href: "/account/addresses", icon: "addresses" as const },
    { label: dict.account.coupons, href: "/account/coupons", icon: "coupons" as const },
    { label: dict.account.notifications, href: "/account/notifications", icon: "notifications" as const },
    { label: dict.account.support, href: "/account/support", icon: "support" as const },
    // "referrals" intentionally omitted — Referral Program is disabled for now
    // (see /account/referrals/page.tsx, which shows a Coming Soon placeholder).
    // Re-add this line to re-enable: { label: dict.account.referrals, href: "/account/referrals", icon: "referrals" as const },
    { label: dict.account.profile, href: "/account/profile", icon: "profile" as const },
    { label: dict.account.settings, href: "/account/settings", icon: "settings" as const },
  ];

  return (
    <AccountShell nav={NAV} userName={user.name} userEmail={user.email} signOutLabel={dict.account.signOut} myAccountLabel={dict.account.myAccount}>
      {children}
    </AccountShell>
  );
}
