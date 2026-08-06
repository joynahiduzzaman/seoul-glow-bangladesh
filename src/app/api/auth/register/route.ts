import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  isRequestSecure,
  signActionToken,
} from "@/server/auth";
import { generateReferralCode } from "@/lib/utils";
import { sendWelcomeEmail, sendVerificationEmail } from "@/server/email";
import { linkGuestOrdersToAccount } from "@/server/orders";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  // Normalised, not just validated: a raw address here would let
  // "Foo@Gmail.com" be stored as a second account alongside "foo@gmail.com",
  // since the duplicate check below is an exact-match findUnique.
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  referralCode: z.string().optional(), // captured from ?ref= link, see middleware/cookie on the storefront
});

export async function POST(req: NextRequest) {
  try {
    // 5 accounts per hour per IP — enough for a real household, too slow for mass sign-up abuse.
    const rl = checkRateLimit(`register:${getClientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many accounts created from this location. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, password, phone, referralCode } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    if (phone) {
      const phoneClash = await prisma.user.findUnique({ where: { phone } });
      if (phoneClash) {
        return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
      }
    }

    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
      if (referrer) referredById = referrer.id;
    }

    const hashed = await hashPassword(password);

    // Referral codes must be globally unique — retry on the rare collision.
    let ownReferralCode = generateReferralCode(name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await prisma.user.findUnique({ where: { referralCode: ownReferralCode } });
      if (!clash) break;
      ownReferralCode = generateReferralCode(name);
    }

    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, role: "CUSTOMER", referralCode: ownReferralCode, referredById },
    });

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    setAuthCookies(accessToken, refreshToken, isRequestSecure(req));

    // Attach any orders placed as a guest under this same email/phone before
    // this account existed — see linkGuestOrdersToAccount's doc comment.
    await linkGuestOrdersToAccount(user.id, user.email, phone);

    // Fire-and-forget emails — never block or fail registration if email isn't configured yet.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    signActionToken(user.id, "verify-email", "24h").then((token) => {
      sendVerificationEmail(user.email, user.name, `${siteUrl}/api/auth/verify-email?token=${token}`).catch(() => {});
    });
    sendWelcomeEmail(user.email, user.name).catch(() => {});

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
