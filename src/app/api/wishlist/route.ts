import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: { brand: { select: { name: true, slug: true } } } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to save items to your wishlist" }, { status: 401 });
  const { productId } = await req.json();
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: {},
    create: { userId: user.id, productId },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { productId } = await req.json();
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  return NextResponse.json({ success: true });
}
