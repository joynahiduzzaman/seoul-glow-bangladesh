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
  logo: z.string().optional(),
  banner: z.string().optional(),
  story: z.string().max(600).optional(),
  country: z.string().max(60).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ brands });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const slug = await uniqueSlug("brand", toSlug(parsed.data.slug || parsed.data.name));
  const brand = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      slug,
      logo: parsed.data.logo || null,
      banner: parsed.data.banner || null,
      story: parsed.data.story || null,
      country: parsed.data.country || "South Korea",
    },
  });

  // The homepage category grid and the shop filters both read this list.
  revalidatePath("/");
  revalidatePath("/shop");
  return NextResponse.json({ brand }, { status: 201 });
}
