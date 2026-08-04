import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(3).max(150),
  message: z.string().min(10).max(2000),
  orderNumber: z.string().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rl = checkRateLimit(`support-ticket:${getClientIp(req)}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many tickets submitted — please wait before opening another." }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      orderNumber: parsed.data.orderNumber || undefined,
      replies: {
        create: {
          message: parsed.data.message,
          isFromStaff: false,
          authorName: user.name,
        },
      },
    },
    include: { replies: true },
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
