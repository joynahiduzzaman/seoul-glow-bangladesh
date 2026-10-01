import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { adjustStock } from "@/server/inventory";
import { prisma } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  change: z.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.string().min(1).max(200),
  // What the restock cost, recorded as a Stock purchase expense alongside the
  // stock movement. Optional, and only meaningful when adding stock: the point
  // is that buying inventory and writing down what it cost are one action, not
  // two screens an owner has to remember to visit in order.
  purchaseCost: z.number().positive().max(100_000_000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { productId, change, reason, purchaseCost } = parsed.data;

  // Expenses are ADMIN/MANAGER only (see api/admin/expenses), while stock
  // adjustment is open to STAFF. Rather than let the lesser role write an
  // expense through this back door, the cost is refused outright — silently
  // dropping it would be worse, since the stock would move and the money would
  // vanish from the books with no sign anything was missed.
  if (purchaseCost != null) {
    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only an admin or manager can record what stock cost. Ask one of them, or leave the cost blank." },
        { status: 403 }
      );
    }
    if (change < 0) {
      return NextResponse.json({ error: "A purchase cost only applies when adding stock" }, { status: 400 });
    }
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const newStock = await adjustStock(productId, change, reason, user.name);
  if (newStock === null) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Written after the stock moves, not inside its transaction: the stock figure
  // is what the shop runs on and must not be rolled back by a bookkeeping
  // failure. A failure here is reported so it can be entered by hand rather
  // than being lost quietly.
  let expenseRecorded = false;
  if (purchaseCost != null && change > 0) {
    try {
      await prisma.expense.create({
        data: {
          title: `Restock: ${product.name} ×${change}`,
          category: "INVENTORY",
          amount: purchaseCost,
          spentAt: new Date(),
          note: reason,
          recordedById: user.id,
        },
      });
      expenseRecorded = true;
      revalidatePath("/admin/expenses");
      revalidatePath("/admin");
    } catch {
      return NextResponse.json(
        {
          stock: newStock,
          expenseRecorded: false,
          warning: "Stock was updated, but the cost could not be saved. Add it on the Expenses page.",
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ stock: newStock, expenseRecorded });
}
