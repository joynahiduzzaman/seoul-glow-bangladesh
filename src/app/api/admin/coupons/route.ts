import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  minSpend: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).refine((d) => d.type !== "PERCENT" || d.value <= 100, {
  message: "A percentage discount can't exceed 100%",
  path: ["value"],
});

export async function GET() {
  // POST was guarded but GET was not, which published every discount code —
  // including inactive and unlisted ones — to anonymous callers who could then
  // simply redeem them at checkout.
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse({ ...body, value: Number(body.value), minSpend: Number(body.minSpend || 0) });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      minSpend: parsed.data.minSpend,
      usageLimit: parsed.data.usageLimit ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      active: true,
    },
  });
  return NextResponse.json({ coupon }, { status: 201 });
}
