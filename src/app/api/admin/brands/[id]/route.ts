import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { toSlug, uniqueSlug, blockingProductCount } from "@/server/taxonomy";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  slug: z.string().trim().max(80).optional(),
  logo: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  story: z.string().max(600).nullable().optional(),
  country: z.string().max(60).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.brand.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.logo !== undefined) data.logo = parsed.data.logo || null;
  if (parsed.data.banner !== undefined) data.banner = parsed.data.banner || null;
  if (parsed.data.story !== undefined) data.story = parsed.data.story || null;
  if (parsed.data.country !== undefined) data.country = parsed.data.country;
  // Renaming does not silently move the public URL — the slug only changes when
  // it is edited directly, so existing links and any SEO on them survive.
  if (parsed.data.slug !== undefined) {
    data.slug = await uniqueSlug("brand", toSlug(parsed.data.slug), params.id);
  }

  const brand = await prisma.brand.update({ where: { id: params.id }, data });
  revalidatePath("/");
  revalidatePath("/shop");
  return NextResponse.json({ brand });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const existing = await prisma.brand.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // Product.categoryId is a required relation, so Prisma would throw a raw
  // foreign-key error here. Refuse with a count and a clear instruction instead
  // of a 500 an admin cannot act on.
  const inUse = await blockingProductCount("brand", params.id);
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `${inUse} product${inUse === 1 ? "" : "s"} still use this brand. Move them to another brand first, then delete it.`,
        productCount: inUse,
      },
      { status: 409 }
    );
  }

  await prisma.brand.delete({ where: { id: params.id } });
  revalidatePath("/");
  revalidatePath("/shop");
  return NextResponse.json({ ok: true });
}
