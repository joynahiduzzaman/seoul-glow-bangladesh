import { prisma } from "./db";
import { SECTION_DEFINITIONS } from "@/lib/homepage-sections";
import { isSectionLive } from "@/lib/homepage-visibility";

/**
 * Returns every HomepageSection row, sorted by displayOrder. If the table is
 * empty — a fresh install, or an existing site that hasn't run this migration's
 * seed step — it auto-populates one row per entry in SECTION_DEFINITIONS, in
 * their defined order, so the homepage renders identically to how it always did
 * before the Homepage Builder existed. This is the actual safety net (not just
 * the seed script) since existing installations won't necessarily re-seed.
 */
export async function getAllHomepageSections() {
  const existing = await prisma.homepageSection.findMany({ orderBy: { displayOrder: "asc" } });
  if (existing.length > 0) return existing;

  await prisma.homepageSection.createMany({
    data: SECTION_DEFINITIONS.map((def, i) => ({
      sectionKey: def.key,
      title: def.label,
      settings: JSON.stringify(def.defaultSettings),
      displayOrder: i,
      enabled: true,
    })),
  });

  return prisma.homepageSection.findMany({ orderBy: { displayOrder: "asc" } });
}

/** Same as above, but only the sections actually visible right now — enabled,
 * published (not draft), and within their publish/unpublish window if scheduled.
 * This is what the live homepage renders. */
export async function getEnabledHomepageSections() {
  const all = await getAllHomepageSections();
  return all.filter((s) => isSectionLive(s));
}
