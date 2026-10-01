import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, hashPassword } from "@/server/auth";
import { generateReferralCode, normalizePhone } from "@/lib/utils";
import { emailSchema } from "@/lib/email-identity";
import { STAFF_ROLE_VALUES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Staff administration.
 *
 * ADMIN only — not MANAGER. Deciding who else gets into the panel is the one
 * privilege that must not be delegable, because a manager who could promote
 * themselves to admin would make the distinction meaningless. This is currently
 * the only genuinely admin-only capability in the API.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's name").max(80),
  email: emailSchema,
  phone: z.string().trim().min(6).max(20).optional().nullable(),
  // 8 is the floor, not a suggestion: these accounts can read every customer's
  // address and phone number, and change prices.
  password: z.string().min(8, "Use at least 8 characters"),
  role: z.enum(STAFF_ROLE_VALUES),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const staff = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLE_VALUES] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      // Never select `password`, even to test it for null — a hash that reaches
      // the client is a hash that can be attacked offline.
      _count: { select: { createdOrders: true, assignedOrders: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, phone, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    // A customer who already shops here can be promoted, but that is a
    // different and more surprising action than creating an account, so it is
    // refused here rather than done silently.
    return NextResponse.json(
      {
        error:
          existing.role === "CUSTOMER"
            ? "That email already belongs to a customer account. Change its role from the list instead."
            : "Someone with that email already has staff access.",
      },
      { status: 409 }
    );
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (normalizedPhone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true } });
    if (phoneTaken) return NextResponse.json({ error: "That phone number is already in use" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: normalizedPhone,
      password: await hashPassword(password),
      role,
      // Staff are created by someone who already trusts them; there is no
      // address to confirm and no welcome flow to gate.
      emailVerified: true,
      marketingOptIn: false,
      referralCode: generateReferralCode(name),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  revalidatePath("/admin/staff");
  return NextResponse.json({ user }, { status: 201 });
}
