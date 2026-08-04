import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Lightweight endpoint that feeds dropdowns (brands/categories) to admin forms.
export async function GET() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ brands, categories });
}
