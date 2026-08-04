import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { notifyUser } from "@/server/notifications";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1).max(2000).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, email: true } }, replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

// Staff reply and/or status change in one call — a reply always implicitly nudges
// status to IN_PROGRESS unless the caller explicitly sets a different status.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.message) {
    await prisma.ticketReply.create({
      data: { ticketId: ticket.id, message: parsed.data.message, isFromStaff: true, authorName: user.name },
    });
    notifyUser({
      userId: ticket.userId,
      type: "GENERAL",
      title: `Reply on: ${ticket.subject}`,
      message: "Our support team replied to your ticket.",
      link: `/account/support/${ticket.id}`,
    });
  }

  const nextStatus = parsed.data.status || (parsed.data.message ? "IN_PROGRESS" : undefined);
  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: nextStatus ? { status: nextStatus } : { updatedAt: new Date() },
    include: { replies: { orderBy: { createdAt: "asc" } }, user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ticket: updated });
}
