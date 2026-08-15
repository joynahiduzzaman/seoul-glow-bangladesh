import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { toSlug, uniqueSlug, blockingProductCount } from "@/server/taxonomy";
import { z } from "zod";
import { deleteImageByUrl } from "@/server/uploads/cloudinary";
import { revalidateCatalogue } from "@/server/catalogue-cache";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  slug: z.string().trim().max(80).optional(),
  image: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.image !== undefined) data.image = parsed.data.image || null;

  // Replacing or clearing an image leaves the previous Cloudinary asset
  // orphaned — still billed for, no longer referenced by anything. Capture the
  // old URL now, and delete it only once the update has actually succeeded.
  const previousImage =
    parsed.data.image !== undefined && existing.image !== (parsed.data.image || null)
      ? existing.image
      : null;

  // Renaming does not silently move the public URL — the slug only changes when
  // it is edited directly, so existing links and any SEO on them survive.
  if (parsed.data.slug !== undefined) {
    data.slug = await uniqueSlug("category", toSlug(parsed.data.slug), params.id);
  }

  const category = await prisma.category.update({ where: { id: params.id }, data });
  if (previousImage) await deleteImageByUrl(previousImage);
  revalidateCatalogue();
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // Product.categoryId is a required relation, so Prisma would throw a raw
  // foreign-key error here. Refuse with a count and a clear instruction instead
  // of a 500 an admin cannot act on.
  const inUse = await blockingProductCount("category", params.id);
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `${inUse} product${inUse === 1 ? " still uses" : "s still use"} this category. Move ${inUse === 1 ? "it" : "them"} to another category first, then delete it.`,
        productCount: inUse,
      },
      { status: 409 }
    );
  }

  await deleteImageByUrl(existing.image);
  await prisma.category.delete({ where: { id: params.id } });
  revalidateCatalogue();
  return NextResponse.json({ ok: true });
}
