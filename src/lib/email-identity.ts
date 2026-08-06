import { z } from "zod";

/**
 * Canonical form for an email address used as an account identifier.
 *
 * Prisma's `findUnique({ where: { email } })` is an exact string comparison, so
 * a stored "seoulglow26@gmail.com" is simply not found when the sign-in form
 * submits "SeoulGlow26@gmail.com" — and the route, correctly refusing to reveal
 * which half was wrong, answers "Invalid email or password". Password managers
 * and mobile keyboards capitalise the first letter and append trailing spaces
 * routinely, so this is not an edge case.
 *
 * Normalising only at lookup would still be a half-fix: without normalising on
 * write, "Foo@Gmail.com" can be registered as a second account alongside
 * "foo@gmail.com", because the duplicate check would not find the first either.
 * Both sides must agree, so every read and every write goes through here.
 *
 * Lower-casing the whole address is deliberate. The local part is technically
 * case-sensitive per RFC 5321, but no mail provider a customer is realistically
 * using treats it that way, and honouring the RFC would mean locking people out
 * of their own accounts over a capital letter.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Zod schema that validates and normalises in one step. */
export const emailSchema = z.string().trim().toLowerCase().email();

/** Optional variant, for schemas where the field may be absent. */
export const optionalEmailSchema = emailSchema.optional();
