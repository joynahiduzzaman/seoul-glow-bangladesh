"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AccountSidebarNav from "@/components/AccountSidebarNav";
import SignOutButton from "@/components/account/SignOutButton";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// Derives the page title from the same nav items the sidebar renders — they're
// already correctly localized (English/Bangla) via the dictionary, so this stays
// in sync with the sidebar automatically instead of maintaining a second,
// English-only title map that could drift out of sync or skip translation.
// Longest-href-prefix match handles dynamic routes like /account/orders/[id].
function titleFor(pathname: string, nav: NavItem[], myAccountLabel: string): string {
  if (pathname === "/account") return myAccountLabel;
  const match = nav
    .filter((item) => item.href !== "/account" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label || myAccountLabel;
}

export default function AccountShell({
  nav,
  userName,
  userEmail,
  signOutLabel,
  myAccountLabel,
  children,
}: {
  nav: NavItem[];
  userName: string;
  userEmail: string;
  signOutLabel: string;
  myAccountLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRoot = pathname === "/account";
  const title = titleFor(pathname, nav, myAccountLabel);

  return (
    <div className="container-px mx-auto py-8 md:py-10">
      {/* Mobile: back link on every sub-page instead of the full sidebar sitting
          above the content on every navigation — the sidebar reappears in full
          only on desktop, where there's room for it to stay persistent. */}
      <div className="md:hidden mb-5">
        <div className="flex items-center justify-between mb-3">
          {!isRoot ? (
            <Link href="/account" className="inline-flex items-center gap-1 text-xs text-ink/70 hover:text-rose-gold-text">
              <ChevronLeft size={14} /> {myAccountLabel}
            </Link>
          ) : (
            <span />
          )}
          <SignOutButton label={signOutLabel} compact />
        </div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
      </div>

      <div className="hidden md:block mb-8">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-10">
        <aside className="hidden md:block space-y-1">
          <div className="mb-4 p-4 rounded-xl2 bg-beige/60 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 font-display text-lg text-rose-gold-text">
              {userName.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-ink/70 truncate">{userEmail}</p>
            </div>
          </div>
          <AccountSidebarNav items={nav as any} signOutLabel={signOutLabel} />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
