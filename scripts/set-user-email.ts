/**
 * Changes an account's login email.
 *
 * The in-app profile form deliberately does not expose this: changing the
 * address you sign in with is an account-recovery action, not a profile edit,
 * and doing it from a logged-in session is a well-known account-takeover path if
 * the session is ever hijacked. So it lives here, behind database access.
 *
 * Usage:
 *   npx tsx scripts/set-user-email.ts <current-email> <new-email>
 *
 * Acts on whatever DATABASE_URL points at — including production. The target
 * host is printed first so that is impossible to miss.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const [from, to] = process.argv.slice(2);

  if (!from || !to) {
    console.error("Usage: npx tsx scripts/set-user-email.ts <current-email> <new-email>");
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.error(`Refusing: "${to}" is not a valid email address.`);
    process.exit(1);
  }

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
    const user = await prisma.user.findUnique({
      where: { email: from },
      select: { id: true, role: true, name: true },
    });
    if (!user) {
      console.error(`No account found for ${from}.`);
      process.exitCode = 1;
      return;
    }

    // User.email is unique; check first so the failure is a clear message rather
    // than a Prisma constraint error.
    const clash = await prisma.user.findUnique({ where: { email: to }, select: { id: true, role: true } });
    if (clash && clash.id !== user.id) {
      console.error(`Refusing: ${to} is already used by another ${clash.role} account.`);
      process.exitCode = 1;
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      // The address is verified by the operator running this, not by a click-through,
      // so the flag stays true and nothing gated on verification locks up.
      data: { email: to, emailVerified: true },
    });

    console.log(`Updated ${user.role} account "${user.name}":`);
    console.log(`  ${from}  ->  ${to}`);
    console.log("\nThe password is unchanged. Sign in with the new address.");
    console.log("Any existing session may need a fresh sign-in.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
