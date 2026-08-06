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

const schema = z.object({
  imageUrl: z.string().min(1, "A thumbnail is required"),
  // Restricted to real Instagram permalinks: the grid promises to open the
  // original post, and an arbitrary URL here would send customers anywhere.
  postUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((u) => /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(u), {
      message: "Must be an Instagram post URL, e.g. https://www.instagram.com/p/ABC123/",
    }),
  caption: z.string().max(300).optional().or(z.literal("")),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const posts = await prisma.instagramPost.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // New posts go to the end rather than the top, so adding one never silently
  // reorders the grid an admin has already arranged.
  const last = await prisma.instagramPost.findFirst({ orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });

  const post = await prisma.instagramPost.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      postUrl: parsed.data.postUrl,
      caption: parsed.data.caption || null,
      enabled: parsed.data.enabled ?? true,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });

  revalidatePath("/");
  return NextResponse.json({ post }, { status: 201 });
}
