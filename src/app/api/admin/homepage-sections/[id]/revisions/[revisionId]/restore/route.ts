import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { snapshotRevision } from "@/server/homepage-revisions";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

/** Restores a section's title/settings/status/schedule to a past revision.
 * The section's CURRENT state is snapshotted first, so restoring is itself
 * undoable — restoring never destroys the version you restored away from. */
export async function POST(_req: Request, { params }: { params: { id: string; revisionId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const revision = await prisma.homepageSectionRevision.findUnique({ where: { id: params.revisionId } });
  if (!revision || revision.sectionId !== params.id) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  await snapshotRevision(params.id);
  const section = await prisma.homepageSection.update({
    where: { id: params.id },
    data: {
      title: revision.title,
      settings: revision.settings,
      status: revision.status,
      publishAt: revision.publishAt,
      unpublishAt: revision.unpublishAt,
    },
  });
  revalidatePath("/");
  return NextResponse.json({ section });
}
