import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, hashPassword } from "@/server/auth";
import { STAFF_ROLE_VALUES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const updateSchema = z.object({
  role: z.enum(STAFF_ROLE_VALUES).optional(),
  password: z.string().min(8, "Use at least 8 characters").optional(),
});

/**
 * Would this change leave the shop with nobody who can administer it?
 *
 * The lockout this prevents is unrecoverable from inside the product: with no
 * ADMIN left, nobody can grant the role back, and the only way in is a
 * developer with database access running scripts/set-admin-password.ts. Worth
 * one extra query on a rare action.
 */
async function wouldRemoveLastAdmin(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
  if (target?.role !== "ADMIN") return false;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  return adminCount <= 1;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "That person no longer exists" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.role && parsed.data.role !== target.role) {
    // Changing your own role is refused outright rather than only when you are
    // the last admin: demoting yourself is almost always a misclick, and the
    // recovery needs someone else to still be an admin.
    if (target.id === admin.id) {
      return NextResponse.json(
        { error: "You can't change your own role. Ask another admin to do it." },
        { status: 400 }
      );
    }
    if (await wouldRemoveLastAdmin(target.id)) {
      return NextResponse.json(
        { error: "This is the only admin left. Promote someone else to admin first." },
        { status: 400 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.password) data.password = await hashPassword(parsed.data.password);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  revalidatePath("/admin/staff");
  return NextResponse.json({ user });
}

/**
 * Revokes staff access by demoting to CUSTOMER.
 *
 * The row is never deleted. These accounts are referenced by the orders they
 * recorded and the payments they verified, and erasing the person would strip
 * the audit trail off real money — "who confirmed this ৳9,770 cash payment"
 * must stay answerable after someone leaves. Demotion closes the panel to them
 * while keeping their history intact, and it is reversible from this same
 * screen if they come back.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "That person no longer exists" }, { status: 404 });

  if (target.id === admin.id) {
    return NextResponse.json({ error: "You can't remove your own access." }, { status: 400 });
  }
  if (await wouldRemoveLastAdmin(target.id)) {
    return NextResponse.json(
      { error: "This is the only admin left. Promote someone else to admin first." },
      { status: 400 }
    );
  }

  await prisma.user.update({ where: { id: params.id }, data: { role: "CUSTOMER" } });

  revalidatePath("/admin/staff");
  return NextResponse.json({ ok: true });
}
