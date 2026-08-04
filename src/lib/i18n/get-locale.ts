import { cookies } from "next/headers";
import { Locale } from "./dictionaries";

// Server-side helper: reads the visitor's chosen language from a cookie.
// Defaults to English for first-time visitors.
export function getLocale(): Locale {
  const cookieLocale = cookies().get("locale")?.value;
  return cookieLocale === "bn" ? "bn" : "en";
}
