/**
 * Full read-only export of every table to a timestamped JSON file.
 *
 * This exists because a schema change once went ahead without a restore point
 * and the database was wiped. Neon's own point-in-time restore is the better
 * recovery tool and should still be the first resort — but it has a retention
 * window, needs console access, and restores everything or nothing. A local dump
 * costs seconds, survives indefinitely, and can be inspected or partially
 * replayed.
 *
 *   npm run db:backup
 *
 * Writes to backups/, which is gitignored: these files contain real customer
 * data and must never reach the repository.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * Order matters on any future restore — parents before children — so it is
 * preserved here rather than relying on Object.keys ordering later.
 */
const MODELS = [
  "user", "brand", "category", "product", "coupon", "siteSetting", "pageContent",
  "homepageSection", "homepageSectionRevision", "address", "cartSession", "commission",
  "stockAdjustment", "review", "wishlistItem", "order", "orderItem", "payment",
  "shipment", "orderEvent", "notification", "supportTicket", "ticketReply",
  "newsletterSubscriber",
] as const;

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host;
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  console.log(`Database: ${host}`);

  const prisma = new PrismaClient();
  try {
    const dump: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const model of MODELS) {
      // Indexed access because the model list is data, not code paths.
      const rows = await (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[model].findMany();
      dump[model] = rows;
      counts[model] = rows.length;
    }

    mkdirSync("backups", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = `backups/neon-backup.${stamp}.json`;
    writeFileSync(file, JSON.stringify(dump));

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    for (const [model, n] of Object.entries(counts)) {
      if (n > 0) console.log(`  ${model.padEnd(26)}${n}`);
    }
    console.log(`  ${"-".repeat(34)}`);
    console.log(`  ${"TOTAL ROWS".padEnd(26)}${total}`);
    console.log(`\nWritten: ${file}`);

    // A backup that captured nothing is worse than none, because it looks like
    // one. Fail loudly rather than leaving an empty file to be trusted later.
    if (total === 0) {
      console.error("\nRefusing to report success: the export is empty. Check DATABASE_URL.");
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
