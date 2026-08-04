import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Publicly readable — this only exposes codes/terms, never usage data tied to any
// individual customer, so no auth check is needed here.
export async function GET() {
  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ coupons });
}
