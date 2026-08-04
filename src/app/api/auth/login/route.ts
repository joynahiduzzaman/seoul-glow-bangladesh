import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyPassword, signAccessToken, signRefreshToken, setAuthCookies, isRequestSecure } from "@/server/auth";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

// Supports two identifier types — email or phone — matching the tabbed login UI.
// Exactly one of the two must be present; which one is decided by which tab the
// person had open, not guessed from the input's shape.
const schema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((data) => Boolean(data.email) !== Boolean(data.phone), {
    message: "Enter your email or phone number",
  });

export async function POST(req: NextRequest) {
  try {
    // 10 attempts per 5 minutes per IP — slows brute-force without blocking normal typos.
    const rl = checkRateLimit(`login:${getClientIp(req)}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please try again in a few minutes." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email/phone and password" }, { status: 400 });
    }
    const { email, phone, password } = parsed.data;

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return NextResponse.json({ error: email ? "Invalid email or password" : "Invalid phone number or password" }, { status: 401 });
    }

    // Accounts created via Google/Facebook have no password to check against.
    if (!user.password) {
      const provider = user.oauthProvider === "facebook" ? "Facebook" : "Google";
      return NextResponse.json({ error: `This account uses ${provider} sign-in. Please continue with ${provider} instead.` }, { status: 401 });
    }

    if (!(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: email ? "Invalid email or password" : "Invalid phone number or password" }, { status: 401 });
    }

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    setAuthCookies(accessToken, refreshToken, isRequestSecure(req));

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
