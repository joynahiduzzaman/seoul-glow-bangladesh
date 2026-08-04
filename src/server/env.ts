/**
 * Fail-fast validation for secrets.
 *
 * Every secret in this app used to have an `|| "some-default"` fallback. That is
 * the dangerous shape: forget the variable in production and the app boots
 * happily, signing real sessions with a secret published in the source tree.
 * Missing configuration must break loudly at startup, not silently downgrade.
 *
 * This module is imported by `auth.ts`, which the Edge middleware pulls in, so
 * it must stay free of Node-only APIs — reading `process.env` is fine in both
 * runtimes.
 */

const MIN_SECRET_LENGTH = 32;

/**
 * Values that are obviously scaffolding rather than a real generated secret.
 *
 * These must cover the literal strings shipped in .env.example — the most likely
 * way a placeholder reaches production is someone copying that file to .env and
 * filling in only the parts they recognise. Note that a placeholder can be long:
 * "change-this-to-a-long-random-string" is 35 characters and would sail past a
 * length check on its own, so shape matters as much as size.
 */
const PLACEHOLDER_PATTERNS = [
  /change[-_ ]?(me|this|it)/i,
  /random[-_ ]?string/i,
  /dev[-_]secret/i,
  /^your[-_]/i,
  /placeholder/i,
  /^example/i,
  /^test[-_]/i,
  /^secret$/i,
  /xxxx/i,
];

const isProduction = process.env.NODE_ENV === "production";

/**
 * `next build` evaluates modules to prerender pages, and it sets NODE_ENV to
 * "production" while doing so. Strength checks are therefore scoped to actual
 * runtime — otherwise nobody could produce a build without the live production
 * secrets on their machine. Presence is still required in every phase.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const enforceStrength = isProduction && !isBuildPhase;

function fail(name: string, problem: string): never {
  throw new Error(
    `[env] ${name} ${problem}.\n` +
      `      The application will not start without it. Generate one with:\n` +
      `        node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"\n` +
      `      then set ${name} in your environment (or .env for local development).`
  );
}

/**
 * Returns the secret, or throws. Presence is mandatory everywhere; length and
 * placeholder checks apply at production runtime, so local development can keep
 * using short throwaway values.
 */
export function requireSecret(name: string): string {
  const value = process.env[name];

  if (value == null || value.trim() === "") fail(name, "is not set");

  if (enforceStrength) {
    if (value.length < MIN_SECRET_LENGTH) {
      fail(name, `is only ${value.length} characters (minimum ${MIN_SECRET_LENGTH} in production)`);
    }
    if (PLACEHOLDER_PATTERNS.some((p) => p.test(value))) {
      fail(name, "still looks like a placeholder value");
    }
  }

  return value;
}
