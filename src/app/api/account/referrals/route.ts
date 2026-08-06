import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { payableCommissionWhere } from "@/server/commissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [referredUsers, commissions] = await Promise.all([
    prisma.user.findMany({ where: { referredById: user.id }, select: { name: true, createdAt: true } }),
    prisma.commission.findMany({ where: { referrerId: user.id, ...payableCommissionWhere }, orderBy: { createdAt: "desc" } }),
  ]);

  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions.filter((c) => c.status === "PAID").reduce((sum, c) => sum + c.amount, 0);

  return NextResponse.json({
    referralCode: user.referralCode,
    referredUsers,
    commissions,
    totalEarned,
    totalPaid,
    totalPending: totalEarned - totalPaid,
    commissionPercent: Number(process.env.AFFILIATE_COMMISSION_PERCENT || 10),
  });
}
