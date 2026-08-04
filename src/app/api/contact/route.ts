import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { sendContactFormEmail } from "@/server/email";

// Public — anyone can reach the Contact page without an account, unlike the
// authenticated support-ticket system under /account/support.
const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(150),
  message: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  // 5 submissions per hour per IP — generous for a real visitor, tight enough to
  // slow down spam given there's no login gate on this endpoint.
  const rl = checkRateLimit(`contact:${getClientIp(req)}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many messages sent. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await sendContactFormEmail(parsed.data);
  // Even if email isn't configured yet, the message is logged server-side and the
  // visitor still gets a normal success response — a missing mail server shouldn't
  // surface as a broken contact form to a potential customer.
  return NextResponse.json({ success: true, delivered: result.sent });
}
