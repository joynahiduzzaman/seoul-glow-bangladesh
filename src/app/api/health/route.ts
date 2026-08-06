import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Liveness and readiness probe.
 *
 * A page returning 200 only proves Next is serving; it says nothing about
 * whether the database behind it is reachable. This actually round-trips a
 * query, so an uptime monitor detects a Neon outage or an exhausted connection
 * pool rather than reporting green while every checkout fails.
 *
 * Deliberately public — a monitor cannot authenticate — so it reveals only
 * whether dependencies respond, never versions, connection strings, counts, or
 * anything else that would help someone attacking the site.
 */
export async function GET() {
  const startedAt = Date.now();

  let database: "ok" | "unreachable" = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch (err) {
    console.error("[health] database check failed:", err);
  }

  const healthy = database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      // Useful for spotting a cold start or a struggling pool without exposing
      // anything about the infrastructure itself.
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      // Never cached: a cached "ok" from before an outage is worse than nothing.
      headers: { "cache-control": "no-store, max-age=0" },
    }
  );
}
