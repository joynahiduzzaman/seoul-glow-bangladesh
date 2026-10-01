import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EXPENSE_CATEGORY_VALUES, EXPENSE_PAYMENT_VALUES, parseSpentAt } from "@/lib/expense-categories";

/**
 * Expenses are financial records, so this is ADMIN/MANAGER only — the same bar
 * the coupons and reports routes use. STAFF can work orders without being able
 * to see or alter what the business spends.
 */
const ALLOWED_ROLES = ["ADMIN", "MANAGER"];

const createSchema = z.object({
  title: z.string().trim().min(2, "Give the expense a short title").max(120),
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  // Rejecting 0 as well as negatives: a zero-taka expense is always a mistyped
  // row, and letting it through would quietly skew the "how many expenses" count
  // without moving any total.
  amount: z.number().positive("Amount must be more than zero").max(100_000_000),
  spentAt: z.string().min(1, "Pick the date the money was spent"),
  vendor: z.string().trim().max(120).optional().nullable(),
  reference: z.string().trim().max(120).optional().nullable(),
  paidVia: z.enum(EXPENSE_PAYMENT_VALUES).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = {};

  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) {
      const start = parseSpentAt(from);
      if (start) {
        start.setHours(0, 0, 0, 0);
        range.gte = start;
      }
    }
    if (to) {
      const end = parseSpentAt(to);
      if (end) {
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
    }
    if (Object.keys(range).length) where.spentAt = range;
  }

  if (category && EXPENSE_CATEGORY_VALUES.includes(category)) where.category = category;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { vendor: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: { recordedBy: { select: { name: true } } },
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse({ ...body, amount: Number(body.amount) });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const spentAt = parseSpentAt(parsed.data.spentAt);
  if (!spentAt) return NextResponse.json({ error: "That date could not be read" }, { status: 400 });

  const expense = await prisma.expense.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      amount: parsed.data.amount,
      spentAt,
      vendor: parsed.data.vendor || null,
      reference: parsed.data.reference || null,
      paidVia: parsed.data.paidVia || null,
      note: parsed.data.note || null,
      recordedById: user.id,
    },
    include: { recordedBy: { select: { name: true } } },
  });

  // The dashboard's profit figures are force-dynamic, but the expenses page is
  // cached like the rest of the admin panel — without this, an owner who just
  // recorded a bill would return to a list that doesn't show it.
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");

  return NextResponse.json({ expense }, { status: 201 });
}
