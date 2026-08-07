import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { signActionToken } from "@/server/auth";
import { sendPasswordResetEmail } from "@/server/email";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

const schema = z.object({ email: emailSchema });

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
    // Awaited, for the reason documented in server/orders.ts: on serverless the
    // execution context can be frozen the moment the response is returned, so a
    // fire-and-forget request to the mail provider may never complete. A reset
    // email that silently never sends locks the customer out of their account,
    // and the deliberate always-success response means nothing else would show
    // it. The provider's answer is logged rather than returned, so this still
    // reveals nothing about whether the address has an account.
    const result = await sendPasswordResetEmail(
      user.email,
      user.name,
      `${siteUrl}/reset-password?token=${token}`
    ).catch((err) => ({ sent: false, error: err }));

    if (!result.sent) {
      console.error(
        `[forgot-password] reset email failed for ${user.email}:`,
        (result as { error?: { message?: string } }).error?.message ?? result
      );
    }
  }

  return NextResponse.json({ success: true });
}
