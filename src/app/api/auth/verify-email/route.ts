import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyActionToken } from "@/server/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  if (!token) return NextResponse.redirect(`${siteUrl}/login?verify=missing`);

  const payload = await verifyActionToken(token, "verify-email");
  if (!payload) return NextResponse.redirect(`${siteUrl}/login?verify=invalid`);

  await prisma.user.update({ where: { id: payload.userId }, data: { emailVerified: true } });
  return NextResponse.redirect(`${siteUrl}/login?verify=success`);
}
