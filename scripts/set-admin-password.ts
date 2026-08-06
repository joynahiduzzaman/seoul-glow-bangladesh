/**
 * Sets a staff account's password directly against the database.
 *
 * The normal way to change a password is in the app: sign in, then
 * /account/profile. This exists for the case that flow cannot cover — being
 * locked out. Self-service recovery goes through /forgot-password, which emails
 * a reset link, and that link can only arrive if the mail provider will deliver
 * to the account's address. While the project uses Resend's shared
 * onboarding@resend.dev sender, delivery is restricted to the address that owns
 * the Resend account, so the store admin cannot reset its own password by email.
 *
 * Usage:
 *   npx tsx scripts/set-admin-password.ts <email> [password]
 *
 * Omit the password and a strong one is generated and printed once.
 * Acts on whatever DATABASE_URL points at — including production. It prints the
 * target database host first so that is impossible to miss.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const MIN_LENGTH = 10;

async function main() {
  const [emailRaw, supplied] = process.argv.slice(2);
  const email = emailRaw?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin-password.ts <email> [password]");
    process.exit(1);
  }

  const password = supplied ?? randomBytes(15).toString("base64url");
  const generated = !supplied;

  if (password.length < MIN_LENGTH) {
    console.error(`Refusing: password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }

  // Make the target unmistakable — this script will happily rewrite production.
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  console.log(`Database: ${host}`);

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, name: true } });
    if (!user) {
      console.error(`No account found for ${email}.`);
      process.exitCode = 1;
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 10) },
    });

    console.log(`Updated ${user.role} ${email} (${user.name}).`);
    if (generated) {
      console.log(`\n  Password: ${password}\n`);
      console.log("Shown once and not stored anywhere — save it now.");
    } else {
      console.log("Password set to the value you supplied.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
