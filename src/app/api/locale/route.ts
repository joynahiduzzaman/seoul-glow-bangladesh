import { NextRequest, NextResponse } from "next/server";

// Sets the `locale` cookie so subsequent server-rendered pages pick up the chosen language.
export async function POST(req: NextRequest) {
  const { locale } = await req.json();
  if (locale !== "en" && locale !== "bn") {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set("locale", locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
