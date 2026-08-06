import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { toSlug, uniqueSlug } from "@/server/taxonomy";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  slug: z.string().trim().max(80).optional(),
  image: z.string().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const slug = await uniqueSlug("category", toSlug(parsed.data.slug || parsed.data.name));
  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug, image: parsed.data.image || null },
  });

  // The homepage category grid and the shop filters both read this list.
  revalidatePath("/");
  revalidatePath("/shop");
  return NextResponse.json({ category }, { status: 201 });
}
