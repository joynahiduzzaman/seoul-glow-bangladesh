import { prisma } from "./db";

// Keeps HomepageSectionRevision from growing unbounded on a section an admin
// edits constantly — oldest revisions past this count are dropped on each save.
export const REVISION_LIMIT = 20;

/** Snapshots a section's current content into HomepageSectionRevision (called
 * BEFORE applying an update, so the revision always holds the state being moved
 * away from), then trims anything past REVISION_LIMIT. Shared by both the normal
 * save path and the revision-restore path (a restore is itself a content change
 * that deserves its own "undo point").
 *
 * Lives outside any route.ts on purpose — Next.js's route module type-checking
 * only allows the recognized HTTP-method exports (GET/POST/etc.) plus a small
 * set of special config exports; any other named export fails `next build`'s
 * type check even though plain `tsc --noEmit` doesn't catch it. */
export async function snapshotRevision(sectionId: string) {
  const current = await prisma.homepageSection.findUnique({ where: { id: sectionId } });
  if (!current) return;
  await prisma.homepageSectionRevision.create({
    data: {
      sectionId,
      title: current.title,
      settings: current.settings,
      status: current.status,
      publishAt: current.publishAt,
      unpublishAt: current.unpublishAt,
    },
  });
  const stale = await prisma.homepageSectionRevision.findMany({
    where: { sectionId },
    orderBy: { createdAt: "desc" },
    skip: REVISION_LIMIT,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.homepageSectionRevision.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }
}
