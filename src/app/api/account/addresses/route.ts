import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  label: z.string().min(1).default("Home"),
  fullName: z.string().min(2),
  phone: z.string().min(6),
  district: z.string().min(2),
  area: z.string().min(2),
  street: z.string().min(2),
  isInsideDhaka: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Only one default address per customer — demote any existing default first.
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({ data: { ...parsed.data, userId: user.id } });
  return NextResponse.json({ address }, { status: 201 });
}
