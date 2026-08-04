import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyActionToken, hashPassword } from "@/server/auth";
import { z } from "zod";

const schema = z.object({ token: z.string(), password: z.string().min(6) });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const payload = await verifyActionToken(parsed.data.token, "reset-password");
  if (!payload) return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });

  const hashed = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: payload.userId }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
