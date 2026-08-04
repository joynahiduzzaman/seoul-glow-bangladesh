import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, signAccessToken, setAuthCookies, signRefreshToken, isRequestSecure } from "@/server/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const refreshToken = cookies().get("refresh_token")?.value;
  if (!refreshToken) return NextResponse.json({ error: "No refresh token" }, { status: 401 });

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });

  const newAccessToken = await signAccessToken({ userId: payload.userId, role: payload.role, email: payload.email });
  const newRefreshToken = await signRefreshToken({ userId: payload.userId, role: payload.role, email: payload.email });
  setAuthCookies(newAccessToken, newRefreshToken, isRequestSecure(req));

  return NextResponse.json({ success: true });
}
