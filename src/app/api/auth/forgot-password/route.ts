import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { signActionToken } from "@/server/auth";
import { sendPasswordResetEmail } from "@/server/email";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  // 3 requests per 15 minutes per IP — resets are also throttled per-email below.
  const rl = checkRateLimit(`forgot-password:${getClientIp(req)}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return success — never reveal whether an email exists in our system.
  if (user) {
    const token = await signActionToken(user.id, "reset-password", "1h");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    sendPasswordResetEmail(user.email, user.name, `${siteUrl}/reset-password?token=${token}`).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
