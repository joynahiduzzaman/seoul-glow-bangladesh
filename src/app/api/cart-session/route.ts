import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), name: z.string(), quantity: z.number() })).min(1),
  total: z.number(),
});

// Called (silently, best-effort) when a checkout visitor has entered their email but hasn't
// completed payment yet — this is what powers abandoned-cart recovery emails.
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`cart-session:${getClientIp(req)}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart session" }, { status: 400 });

  const { email, name, phone, items, total } = parsed.data;

  await prisma.cartSession.upsert({
    where: { id: `session_${email}` },
    update: { itemsJson: JSON.stringify(items), total, name, phone, recovered: false, emailedAt: null },
    create: { id: `session_${email}`, email, name, phone, itemsJson: JSON.stringify(items), total },
  });

  return NextResponse.json({ success: true });
}
