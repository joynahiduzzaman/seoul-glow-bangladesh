import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/server/auth";

export async function POST() {
  clearAuthCookies();
  return NextResponse.json({ success: true });
}
