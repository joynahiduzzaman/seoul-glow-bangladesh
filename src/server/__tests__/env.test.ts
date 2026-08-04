import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * env.ts reads NODE_ENV/NEXT_PHASE at module scope, so each case has to reset
 * the module registry and re-import after setting the environment.
 */
async function load(env: Record<string, string | undefined>) {
  const { vi } = await import("vitest");
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("../env")).requireSecret;
}

const ORIGINAL = { ...process.env };
const STRONG = "K7fx9QzR2mVw8pLdT4hNbY6cJ3sE5gAu1oXi";

beforeEach(() => {
  delete process.env.PROBE;
  delete process.env.NEXT_PHASE;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("requireSecret", () => {
  it("throws when the variable is absent — no fallback value exists", async () => {
    const requireSecret = await load({ NODE_ENV: "development", PROBE: undefined });
    expect(() => requireSecret("PROBE")).toThrow(/PROBE is not set/);
  });

  it("treats a whitespace-only value as unset", async () => {
    const requireSecret = await load({ NODE_ENV: "development", PROBE: "   " });
    expect(() => requireSecret("PROBE")).toThrow(/is not set/);
  });

  it("never returns a hardcoded default", async () => {
    const requireSecret = await load({ NODE_ENV: "development", PROBE: undefined });
    let returned: string | undefined;
    try {
      returned = requireSecret("PROBE");
    } catch {
      /* expected */
    }
    expect(returned).toBeUndefined();
    // The old fallbacks must not survive anywhere in the module source.
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../env.ts", import.meta.url), "utf8")
    );
    expect(src).not.toMatch(/dev-secret-change-me|dev-refresh-secret|dev-action-secret/);
  });

  it("allows a short throwaway secret in development", async () => {
    const requireSecret = await load({ NODE_ENV: "development", PROBE: "shortdev" });
    expect(requireSecret("PROBE")).toBe("shortdev");
  });

  it("rejects a short secret at production runtime", async () => {
    const requireSecret = await load({ NODE_ENV: "production", PROBE: "tooshort" });
    expect(() => requireSecret("PROBE")).toThrow(/minimum 32/);
  });

  it("rejects a long-but-placeholder secret at production runtime", async () => {
    const requireSecret = await load({ NODE_ENV: "production", PROBE: "dev-secret-change-me-padding-padding-x" });
    expect(() => requireSecret("PROBE")).toThrow(/placeholder/);
  });

  it("accepts a strong secret in production", async () => {
    const requireSecret = await load({ NODE_ENV: "production", PROBE: STRONG });
    expect(requireSecret("PROBE")).toBe(STRONG);
  });

  /**
   * The likeliest route for a placeholder to reach production is `cp .env.example
   * .env` followed by filling in only the recognisable fields. So whatever that
   * file ships as a secret must be rejected — including long placeholders that
   * would otherwise pass the length check.
   */
  it("rejects every secret placeholder shipped in .env.example", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(process.cwd(), ".env.example");
    const example = fs.readFileSync(file, "utf8");

    const secretLines = example
      .split(/\r?\n/)
      .filter((l) => /^(JWT_SECRET|JWT_REFRESH_SECRET|CRON_SECRET)=/.test(l))
      .map((l) => l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "").trim())
      .filter(Boolean);

    expect(secretLines.length).toBeGreaterThan(0);

    for (const placeholder of secretLines) {
      const requireSecret = await load({ NODE_ENV: "production", PROBE: placeholder });
      expect(
        () => requireSecret("PROBE"),
        `.env.example ships ${JSON.stringify(placeholder)} which production would accept`
      ).toThrow();
    }
  });

  it("relaxes strength checks during next build, but still demands presence", async () => {
    const build = { NODE_ENV: "production", NEXT_PHASE: "phase-production-build" };
    const weak = await load({ ...build, PROBE: "dev-secret-change-me" });
    expect(weak("PROBE")).toBe("dev-secret-change-me");

    const absent = await load({ ...build, PROBE: undefined });
    expect(() => absent("PROBE")).toThrow(/is not set/);
  });
});
