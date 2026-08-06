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

const schema = z.object({ ids: z.array(z.string()).min(1) });

/** Persists a new grid order. Ids arrive in their intended display sequence. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });

  // One transaction: a partial reorder would leave duplicate displayOrder values
  // and an arbitrary grid sequence.
  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.instagramPost.update({ where: { id }, data: { displayOrder: index } })
    )
  );

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
