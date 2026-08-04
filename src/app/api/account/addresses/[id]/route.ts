import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  label: z.string().min(1).optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  district: z.string().min(2).optional(),
  area: z.string().min(2).optional(),
  street: z.string().min(2).optional(),
  isInsideDhaka: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

async function requireOwnedAddress(userId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) return null;
  return address;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await requireOwnedAddress(user.id, params.id);
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
  }

  const address = await prisma.address.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ address });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await requireOwnedAddress(user.id, params.id);
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  await prisma.address.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
