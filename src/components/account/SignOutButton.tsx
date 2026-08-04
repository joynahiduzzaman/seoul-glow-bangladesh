"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/** Shared sign-out logic — used by the desktop sidebar (full row) and the mobile
 * account header (compact link), so the fetch+redirect behavior lives in one place. */
export default function SignOutButton({ label, compact = false }: { label: string; compact?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (compact) {
    return (
      <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-rose-gold-text transition-colors">
        <LogOut size={13} /> {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-ink/70 transition-colors hover:bg-beige/60 hover:text-ink"
    >
      <LogOut size={16} /> {label}
    </button>
  );
}
