import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["delete", "activate", "draft", "changeCategory", "changeBrand"]),
  value: z.string().optional(), // categoryId or brandId, required for those two actions
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { ids, action, value } = parsed.data;

  if (action === "activate") {
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "ACTIVE" } });
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (action === "draft") {
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } });
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (action === "changeCategory") {
    if (!value) return NextResponse.json({ error: "Select a category" }, { status: 400 });
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: value } });
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (action === "changeBrand") {
    if (!value) return NextResponse.json({ error: "Select a brand" }, { status: 400 });
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { brandId: value } });
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (action === "delete") {
    // Same protection as single-product delete: skip (don't fail the whole batch
    // for) any product with real order history, and report what happened rather
    // than silently ignoring it.
    const withOrders = await prisma.orderItem.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ["productId"] });
    const blockedIds = new Set(withOrders.map((o) => o.productId));
    const deletableIds = ids.filter((id) => !blockedIds.has(id));

    if (deletableIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: deletableIds } } });
    }

    return NextResponse.json({
      success: true,
      count: deletableIds.length,
      skipped: blockedIds.size,
      message: blockedIds.size > 0 ? `${blockedIds.size} product(s) with order history were skipped — set them to Draft instead.` : undefined,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
