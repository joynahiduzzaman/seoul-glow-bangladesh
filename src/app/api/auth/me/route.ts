import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  // getCurrentUser already strips the password hash, so `user` is safe to send as-is —
  // unlike /api/auth/login and /api/auth/register, which destructure it off the raw record.
  return NextResponse.json({ user });
}
