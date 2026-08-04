import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, phone, currentPassword, newPassword } = parsed.data;

  const data: any = {};
  if (name) data.name = name;
  if (phone !== undefined) data.phone = phone;

  if (newPassword) {
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (fullUser.password) {
      // Already has a password (regular account, or an OAuth account that set one
      // before) — changing it requires proving you know the current one.
      if (!currentPassword) return NextResponse.json({ error: "Enter your current password to set a new one" }, { status: 400 });
      if (!(await verifyPassword(currentPassword, fullUser.password))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }
    // else: OAuth-only account with no password yet — let them set their first one
    // without needing to "confirm" a password that doesn't exist.
    data.password = await hashPassword(newPassword);
  }

  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    const { password, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "That phone number is already in use by another account" }, { status: 409 });
    }
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
