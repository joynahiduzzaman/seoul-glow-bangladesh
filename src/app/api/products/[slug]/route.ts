import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      brand: true,
      category: true,
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product || product.status === "DRAFT") return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ product });
}
