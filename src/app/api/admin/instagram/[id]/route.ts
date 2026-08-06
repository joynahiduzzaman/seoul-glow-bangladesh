import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const updateSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  postUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(u), {
      message: "Must be an Instagram post URL, e.g. https://www.instagram.com/p/ABC123/",
    })
    .optional(),
  caption: z.string().max(300).nullable().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.instagramPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.postUrl !== undefined) data.postUrl = parsed.data.postUrl;
  if (parsed.data.caption !== undefined) data.caption = parsed.data.caption || null;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

  const post = await prisma.instagramPost.update({ where: { id: params.id }, data });
  revalidatePath("/");
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const existing = await prisma.instagramPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  await prisma.instagramPost.delete({ where: { id: params.id } });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
