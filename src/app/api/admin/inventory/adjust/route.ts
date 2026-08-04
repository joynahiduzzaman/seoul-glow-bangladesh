import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { adjustStock } from "@/server/inventory";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  change: z.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const newStock = await adjustStock(parsed.data.productId, parsed.data.change, parsed.data.reason, user.name);
  if (newStock === null) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({ stock: newStock });
}
