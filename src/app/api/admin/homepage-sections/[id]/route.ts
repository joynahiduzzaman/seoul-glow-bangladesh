import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { snapshotRevision } from "@/server/homepage-revisions";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const schema = z.object({
  title: z.string().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  // Sent as ISO strings from the admin's datetime-local inputs; null explicitly
  // clears a schedule (distinct from "not included in this request" = leave as-is).
  publishAt: z.string().datetime().nullable().optional(),
  unpublishAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const data: any = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.settings !== undefined) data.settings = JSON.stringify(parsed.data.settings);
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.publishAt !== undefined) data.publishAt = parsed.data.publishAt ? new Date(parsed.data.publishAt) : null;
  if (parsed.data.unpublishAt !== undefined) data.unpublishAt = parsed.data.unpublishAt ? new Date(parsed.data.unpublishAt) : null;

  // Only content changes get a revision — a bare enable/disable toggle (the only
  // field in play for that action) would otherwise spam the history on every click.
  const isContentChange =
    parsed.data.title !== undefined ||
    parsed.data.settings !== undefined ||
    parsed.data.status !== undefined ||
    parsed.data.publishAt !== undefined ||
    parsed.data.unpublishAt !== undefined;

  try {
    if (isContentChange) await snapshotRevision(params.id);
    const section = await prisma.homepageSection.update({ where: { id: params.id }, data });
    revalidatePath("/");
    return NextResponse.json({ section });
  } catch {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const section = await prisma.homepageSection.findUnique({ where: { id: params.id } });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  // Server-side enforcement, not just a hidden button client-side — built-in
  // sections can never be deleted even via a direct API call.
  if (!section.isCustom) return NextResponse.json({ error: "Only custom sections can be deleted" }, { status: 403 });

  await prisma.homepageSection.delete({ where: { id: params.id } });
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
