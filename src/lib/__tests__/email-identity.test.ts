import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { normalizeEmail, emailSchema } from "../email-identity";

/**
 * Admin sign-in failed with "Invalid email or password" while the account was
 * intact and its bcrypt hash verified. The cause was the lookup:
 * `findUnique({ where: { email } })` is an exact string comparison, so a stored
 * "seoulglow26@gmail.com" is not found when the form submits
 * "SeoulGlow26@gmail.com" — which password managers and mobile keyboards
 * produce routinely.
 */
describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail(" SeoulGlow26@Gmail.COM ")).toBe("seoulglow26@gmail.com");
  });

  it("is idempotent", () => {
    const once = normalizeEmail("Foo@Bar.com");
    expect(normalizeEmail(once)).toBe(once);
  });

  it("maps every casing of one address to the same key", () => {
    const forms = ["seoulglow26@gmail.com", "SEOULGLOW26@GMAIL.COM", "SeoulGlow26@gmail.com", "  seoulglow26@gmail.com  "];
    expect(new Set(forms.map(normalizeEmail)).size).toBe(1);
  });
});

describe("emailSchema", () => {
  it("normalises during validation, so callers cannot forget", () => {
    expect(emailSchema.parse(" SeoulGlow26@Gmail.COM ")).toBe("seoulglow26@gmail.com");
  });

  it("accepts a padded address that a raw z.string().email() would reject", () => {
    // The whitespace variant previously returned HTTP 400 rather than 401 —
    // a different symptom of the same missing normalisation.
    expect(emailSchema.safeParse(" user@example.com ").success).toBe(true);
  });

  it("still rejects genuinely invalid addresses", () => {
    for (const bad of ["not-an-email", "", "@example.com", "a@b"]) {
      expect(emailSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

/**
 * Normalising only at lookup would be a half-fix: without it on write,
 * "Foo@Gmail.com" registers as a second account beside "foo@gmail.com" because
 * the duplicate check misses the first too. So no route may reintroduce a raw
 * email schema.
 */
describe("no route validates an email without normalising it", () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__tests__") continue;
        walk(p, acc);
      } else if (e.name.endsWith(".ts")) acc.push(p);
    }
    return acc;
  }

  it("uses emailSchema everywhere instead of z.string().email()", () => {
    const offenders: string[] = [];
    for (const file of [...walk(path.resolve(process.cwd(), "src/app/api")), ...walk(path.resolve(process.cwd(), "src/server"))]) {
      const src = readFileSync(file, "utf8");
      src.split(/\r?\n/).forEach((line, i) => {
        if (line.includes("z.string().email()")) {
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
        }
      });
    }
    expect(
      offenders,
      `These validate an email without normalising it, so a capitalised address ` +
        `creates a row that login can never match. Use emailSchema:\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
  });
});
