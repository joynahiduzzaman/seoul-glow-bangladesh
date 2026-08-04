import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Prisma compiles `contains` to SQL LIKE. SQLite evaluates that case-insensitively
 * for ASCII; PostgreSQL does not. When this project moved from SQLite to Neon,
 * every search silently became case-sensitive — "snail" matched nothing while
 * "Snail" matched — which is invisible in code review and in any test that
 * happens to search with the same capitalisation the seed data uses.
 *
 * This guards the whole codebase rather than one endpoint, because the same
 * mistake reappears every time someone adds a new search box.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      sourceFiles(p, acc);
    } else if (/\.tsx?$/.test(entry.name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("Prisma string search is case-insensitive on PostgreSQL", () => {
  it("every `contains:` filter sets mode: insensitive", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(path.resolve(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!line.includes("contains:")) return;
        // The mode can sit on the same line or the line immediately after.
        const window = [line, lines[i + 1] ?? ""].join(" ");
        if (!window.includes("insensitive")) {
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      `These queries compile to case-sensitive LIKE on PostgreSQL, so lowercase ` +
        `searches return nothing. Add mode: "insensitive":\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
  });
});
