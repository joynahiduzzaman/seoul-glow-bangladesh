import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

/**
 * Marks every unread notification for the signed-in user as read.
 *
 * The per-notification PATCH already exists; this is the bulk case, which the
 * header panel needs and which would otherwise be one request per row.
 *
 * Scoped to the caller's own id — a user can never clear someone else's inbox,
 * and no id is accepted from the client to make that impossible by construction.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true, count });
}
