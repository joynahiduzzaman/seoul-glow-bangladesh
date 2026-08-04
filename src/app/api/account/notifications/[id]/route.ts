import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  const notification = await prisma.notification.update({ where: { id: params.id }, data: { read: true } });
  return NextResponse.json({ notification });
}
