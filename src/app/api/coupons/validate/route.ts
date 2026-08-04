import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase();
  const subtotal = Number(searchParams.get("subtotal") || 0);

  if (!code) return NextResponse.json({ valid: false, message: "Enter a coupon code" });

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return NextResponse.json({ valid: false, message: "Invalid or expired coupon" });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ valid: false, message: "Coupon expired" });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ valid: false, message: "Coupon usage limit reached" });
  if (subtotal < coupon.minSpend) return NextResponse.json({ valid: false, message: `Minimum spend ${coupon.minSpend} BDT required` });

  const discount = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  return NextResponse.json({ valid: true, discount, code: coupon.code, type: coupon.type, value: coupon.value });
}
