import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/server/db";
import { BUSINESS_DEFAULTS, type BusinessInfo, type ContentValues } from "@/lib/site-content";
import { PAGE_DEFAULTS } from "@/lib/site-content-defaults";

const BUSINESS_TAG = "site-business-info";
const pageTag = (key: string) => `page-content-${key}`;

/**
 * Global business info (phone, email, address, hours, socials), with saved
 * values layered over the shipped defaults.
 *
 * A blank saved value falls through to the default rather than rendering an
 * empty string — clearing a field in the admin should restore the default, not
 * leave a hole in the footer where the phone number used to be.
 */
export const getBusinessInfo = unstable_cache(
  async (): Promise<BusinessInfo> => {
    let saved: Record<string, string> = {};
    try {
      const rows = await prisma.siteSetting.findMany();
      saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    } catch {
      // Table missing (fresh clone before `prisma db push`) — fall back to
      // defaults rather than 500-ing every page that renders the footer.
      saved = {};
    }
    const merged = { ...BUSINESS_DEFAULTS };
    for (const key of Object.keys(BUSINESS_DEFAULTS)) {
      const v = saved[key];
      if (typeof v === "string" && v.trim() !== "") merged[key] = v;
    }
    return merged;
  },
  ["site-business-info"],
  { tags: [BUSINESS_TAG], revalidate: 300 }
);

/**
 * Editable copy for one content page, with saved values layered over the
 * shipped defaults.
 *
 * Merge is per-key and shallow by design: a page that has only ever had its
 * title edited keeps every other default, and a field added to PAGE_DEFS later
 * appears immediately with its default instead of rendering blank.
 */
export async function getPageContent(pageKey: string): Promise<ContentValues> {
  const defaults = PAGE_DEFAULTS[pageKey] || {};
  const load = unstable_cache(
    async () => {
      try {
        const row = await prisma.pageContent.findUnique({ where: { pageKey } });
        if (!row) return {};
        const parsed = JSON.parse(row.content);
        return parsed && typeof parsed === "object" ? (parsed as ContentValues) : {};
      } catch {
        return {};
      }
    },
    [`page-content-${pageKey}`],
    { tags: [pageTag(pageKey)], revalidate: 300 }
  );

  const saved = await load();
  const merged: ContentValues = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    // Only accept a saved value that actually carries content, so an empty
    // string or an emptied list falls back to the default.
    if (typeof value === "string") {
      if (value.trim() !== "") merged[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      merged[key] = value;
    }
  }
  return merged;
}

/** Narrowing helpers — the JSON blob is loosely typed, these keep call sites
 * from having to cast at every usage. */
export function text(content: ContentValues, key: string): string {
  const v = content[key];
  return typeof v === "string" ? v : "";
}

export function rows(content: ContentValues, key: string): Array<Record<string, string>> {
  const v = content[key];
  return Array.isArray(v) ? v : [];
}

/** Called after an admin save so the change is visible immediately rather than
 * waiting out the revalidate window. */
export function invalidateBusinessInfo() {
  revalidateTag(BUSINESS_TAG);
}
export function invalidatePageContent(pageKey: string) {
  revalidateTag(pageTag(pageKey));
}
