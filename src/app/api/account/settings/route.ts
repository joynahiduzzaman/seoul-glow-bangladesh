import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, verifyPassword, clearAuthCookies } from "@/server/auth";
import { z } from "zod";

const schema = z.object({ marketingOptIn: z.boolean() });

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: user.id }, data: { marketingOptIn: parsed.data.marketingOptIn } });
  return NextResponse.json({ marketingOptIn: updated.marketingOptIn });
}

const deleteSchema = z.object({ password: z.string().min(1) });

// Account deletion: verifies the current password first (this is a destructive,
// effectively irreversible action), then deletes the user. Orders are preserved for
// business/accounting records — Order.userId is set to null (via onDelete: SetNull in
// the schema) rather than the orders themselves being deleted. Wishlist, addresses,
// reviews, and notifications DO cascade-delete with the user, since those are personal
// data that has no reason to survive account deletion.
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please enter your password to confirm" }, { status: 400 });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fullUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!fullUser.password) {
    return NextResponse.json(
      { error: "This account uses Google/Facebook sign-in and has no password to confirm with. Please contact support to delete it." },
      { status: 400 }
    );
  }

  if (!(await verifyPassword(parsed.data.password, fullUser.password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: user.id } });
  clearAuthCookies();

  return NextResponse.json({ success: true });
}
