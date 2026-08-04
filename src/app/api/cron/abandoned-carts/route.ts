import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendAbandonedCartEmail } from "@/server/email";

// Call this from an external scheduler (Vercel Cron, cron-job.org, GitHub Actions, etc.)
// on a schedule like every 30 minutes:
//   GET https://yourdomain.com/api/cron/abandoned-carts
//   Header: Authorization: Bearer <CRON_SECRET>
// Next.js has no built-in background job runner, so a real cron trigger is required —
// this route is the "abandoned cart recovery" logic itself, ready to be scheduled.
const ABANDON_AFTER_MINUTES = 60;

/** Length-independent equality, so a wrong token leaks nothing through timing. */
function secretsMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  // Interpolating an unset CRON_SECRET used to produce the literal string
  // "Bearer undefined", which anyone could send to trigger this job. Absent
  // configuration must disable the endpoint, never open it.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    console.error("[cron/abandoned-carts] CRON_SECRET is not configured; refusing to run.");
    return NextResponse.json({ error: "Cron endpoint is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60 * 1000);
  const sessions = await prisma.cartSession.findMany({
    where: { recovered: false, emailedAt: null, createdAt: { lte: cutoff } },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  let sent = 0;

  for (const session of sessions) {
    if (!session.email) continue;
    let items: { name: string }[] = [];
    try {
      items = JSON.parse(session.itemsJson);
    } catch {
      continue;
    }
    await sendAbandonedCartEmail(session.email, session.name || "", items, `${siteUrl}/cart`);
    await prisma.cartSession.update({ where: { id: session.id }, data: { emailedAt: new Date() } });
    sent++;
  }

  return NextResponse.json({ checked: sessions.length, emailsSent: sent });
}
