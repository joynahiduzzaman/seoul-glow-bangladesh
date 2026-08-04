import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

async function requireCouponAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

const updateSchema = z.object({
  code: z.string().min(3).max(20).optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  minSpend: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
}).refine((d) => d.type !== "PERCENT" || d.value === undefined || d.value <= 100, {
  message: "A percentage discount can't exceed 100%",
  path: ["value"],
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireCouponAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { code, expiresAt, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (code !== undefined) data.code = code.toUpperCase();
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

  if (data.code) {
    const clash = await prisma.coupon.findFirst({ where: { code: data.code, NOT: { id: params.id } } });
    if (clash) return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
  }

  try {
    const coupon = await prisma.coupon.update({ where: { id: params.id }, data });
    return NextResponse.json({ coupon });
  } catch {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireCouponAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const coupon = await prisma.coupon.findUnique({ where: { id: params.id } });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

  // A coupon that's already been used is part of order history — deleting it would
  // orphan the reference on those orders. Disable it instead, and tell the admin
  // why, rather than silently converting the delete into something else.
  if (coupon.usedCount > 0) {
    return NextResponse.json(
      { error: "This coupon has been used on past orders and can't be deleted. Disable it instead to stop new use." },
      { status: 409 }
    );
  }

  await prisma.coupon.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
