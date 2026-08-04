import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

const replySchema = z.object({ message: z.string().min(1).max(2000) });

async function requireOwnedTicket(userId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== userId) return null;
  return ticket;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.userId !== user.id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  return NextResponse.json({ ticket });
}

// Customer adds a reply to their own open ticket.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ticket = await requireOwnedTicket(user.id, params.id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (ticket.status === "CLOSED") return NextResponse.json({ error: "This ticket is closed" }, { status: 400 });

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const reply = await prisma.ticketReply.create({
    data: { ticketId: ticket.id, message: parsed.data.message, isFromStaff: false, authorName: user.name },
  });

  // Replying re-opens a resolved ticket for staff attention, but doesn't touch a ticket
  // that's still actively OPEN/IN_PROGRESS.
  if (ticket.status === "RESOLVED") {
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
  } else {
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
  }

  return NextResponse.json({ reply }, { status: 201 });
}
