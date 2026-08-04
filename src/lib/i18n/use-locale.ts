"use client";

import { useEffect, useState } from "react";
import { dictionaries, Locale, Dictionary } from "./dictionaries";

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )locale=(en|bn)/);
  return (match?.[1] as Locale) || "en";
}

/** Client-side hook that reads the `locale` cookie (kept in sync with the server-set cookie). */
export function useLocale(): { locale: Locale; dict: Dictionary } {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  return { locale, dict: dictionaries[locale] as Dictionary };
}
