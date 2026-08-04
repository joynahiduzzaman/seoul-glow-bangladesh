import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

const schema = z.object({
  order: z.array(z.object({ id: z.string(), displayOrder: z.number().int() })).min(1),
});

// "Save Layout" — applies the full new order in one go. A transaction so a
// partial failure can't leave sections with duplicate/gapped displayOrder values.
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  await prisma.$transaction(
    parsed.data.order.map(({ id, displayOrder }) =>
      prisma.homepageSection.update({ where: { id }, data: { displayOrder } })
    )
  );

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
