import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendNewsletterWelcomeEmail } from "@/server/email";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

const schema = z.object({ email: emailSchema });

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`newsletter:${getClientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });

  try {
    // upsert, so subscribing twice is a no-op rather than a unique-constraint
    // error the visitor would see as a failure.
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: parsed.data.email } });
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });

    // Awaited, not fire-and-forget: on serverless the execution context can be
    // frozen the moment the response is returned, so a detached send may never
    // reach the provider — the same failure server/orders.ts documents. This
    // was the last `.catch(() => {})` send left on the site. It can't fail the
    // request either: someone who typed their email in is on the list whether
    // or not the mail provider is having a bad minute.
    //
    // Only for a genuinely new subscriber — re-submitting the same address
    // shouldn't send the welcome email again.
    if (!existing) {
      await sendNewsletterWelcomeEmail(parsed.data.email).catch(() => {});
    }
    return NextResponse.json({ success: true, alreadySubscribed: Boolean(existing) });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
