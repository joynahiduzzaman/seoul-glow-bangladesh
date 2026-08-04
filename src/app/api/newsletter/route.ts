import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendNewsletterWelcomeEmail } from "@/server/email";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`newsletter:${getClientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });
    sendNewsletterWelcomeEmail(parsed.data.email).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
