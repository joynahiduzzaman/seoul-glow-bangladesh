import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { generateReferralCode } from "@/lib/utils";
import { z } from "zod";
import { emailSchema } from "@/lib/email-identity";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

// GET /api/admin/customers?q=... — searches real customer accounts by name,
// email, or phone, for the manual order form's "existing customer" picker.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ customers: [] });

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      addresses: { where: { isDefault: true }, take: 1 },
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ customers });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: emailSchema,
  phone: z.string().min(6).optional(),
});

// POST /api/admin/customers — creates a real customer account for a phone/walk-in
// order, without logging the admin in as them (no auth cookies set here, unlike
// /api/auth/register). Created without a password; the customer can set one
// later via "Forgot password" if they ever want to log in themselves.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  if (phone) {
    const phoneClash = await prisma.user.findUnique({ where: { phone } });
    if (phoneClash) return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
  }

  let referralCode = generateReferralCode(name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.user.findUnique({ where: { referralCode } });
    if (!clash) break;
    referralCode = generateReferralCode(name);
  }

  const user = await prisma.user.create({
    data: { name, email, phone, role: "CUSTOMER", referralCode },
  });

  const { password: _pw, ...safeUser } = user;
  return NextResponse.json({ customer: safeUser }, { status: 201 });
}
