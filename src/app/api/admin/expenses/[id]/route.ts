import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EXPENSE_CATEGORY_VALUES, EXPENSE_PAYMENT_VALUES, parseSpentAt } from "@/lib/expense-categories";

const ALLOWED_ROLES = ["ADMIN", "MANAGER"];

const updateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  category: z.enum(EXPENSE_CATEGORY_VALUES).optional(),
  amount: z.number().positive().max(100_000_000).optional(),
  spentAt: z.string().min(1).optional(),
  vendor: z.string().trim().max(120).nullable().optional(),
  reference: z.string().trim().max(120).nullable().optional(),
  paidVia: z.enum(EXPENSE_PAYMENT_VALUES).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const body = await req.json();
  // `amount` only becomes a number when the caller actually sent one — coercing
  // an absent field would turn it into NaN and fail validation on a request that
  // never intended to change it.
  const parsed = updateSchema.safeParse(
    body.amount === undefined ? body : { ...body, amount: Number(body.amount) }
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.spentAt) {
    const spentAt = parseSpentAt(parsed.data.spentAt);
    if (!spentAt) return NextResponse.json({ error: "That date could not be read" }, { status: 400 });
    data.spentAt = spentAt;
  }

  const expense = await prisma.expense.update({
    where: { id: params.id },
    data,
    include: { recordedBy: { select: { name: true } } },
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");

  return NextResponse.json({ expense });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  await prisma.expense.delete({ where: { id: params.id } });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
