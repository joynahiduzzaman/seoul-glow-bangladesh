"use client";

import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n/dictionaries";
import { Languages } from "lucide-react";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  async function switchTo(next: Locale) {
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <Languages size={14} className="text-ink/70 mr-1" />
      <button onClick={() => switchTo("en")} className={locale === "en" ? "font-semibold text-rose-gold-text" : "text-ink/70 hover:text-rose-gold"}>EN</button>
      <span className="text-ink/20">|</span>
      <button onClick={() => switchTo("bn")} className={locale === "bn" ? "font-semibold text-rose-gold-text" : "text-ink/70 hover:text-rose-gold"}>বাং</button>
    </div>
  );
}
