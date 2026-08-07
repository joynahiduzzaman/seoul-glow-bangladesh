import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * These guard three sends that were failing silently.
 *
 * Every one of them is fire-and-forget-shaped by default, and on serverless a
 * detached request to the mail provider can be discarded the moment the response
 * is returned — the failure server/orders.ts already documents. Nothing else
 * surfaces it: forgot-password deliberately always answers "success", and
 * registration returns the new account either way.
 *
 * Read as source rather than executed: the bug is in how the call is sequenced,
 * which is exactly what a mock would paper over.
 */
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("password reset email", () => {
  const source = read("src/app/api/auth/forgot-password/route.ts");

  it("is awaited, not fired and forgotten", () => {
    expect(source).toMatch(/await sendPasswordResetEmail\(/);
  });

  it("no longer swallows the outcome with an empty catch", () => {
    expect(source).not.toMatch(/sendPasswordResetEmail\([\s\S]*?\.catch\(\(\)\s*=>\s*\{\s*\}\)/);
  });

  it("logs a failed send so a broken reset flow is traceable", () => {
    expect(source).toMatch(/console\.error\(\s*[`"']\[forgot-password\]/);
  });

  it("still answers the same way whether or not the address exists", () => {
    // The success response must sit outside the `if (user)` branch, or the
    // endpoint would leak which emails have accounts.
    const branch = source.slice(source.indexOf("if (user)"));
    expect(branch).toMatch(/\}\s*return NextResponse\.json\(\{ success: true \}\)/);
  });
});

describe("registration emails", () => {
  const source = read("src/app/api/auth/register/route.ts");

  it("awaits both the welcome and the verification send", () => {
    expect(source).toMatch(/await Promise\.allSettled\(/);
    expect(source).toMatch(/sendVerificationEmail\(/);
    expect(source).toMatch(/sendWelcomeEmail\(/);
  });

  it("does not detach the sends behind .then()", () => {
    expect(source).not.toMatch(/signActionToken\([\s\S]{0,80}\)\.then\(/);
  });

  it("still returns the account even when mail fails", () => {
    // allSettled, not all: a rejected send must not take the registration down.
    expect(source).not.toMatch(/await Promise\.all\(\s*\[/);
    expect(source).toMatch(/status: 201/);
  });
});

describe("social sign-up welcome email", () => {
  const source = read("src/server/oauth.ts");

  it("sends a welcome email to a genuinely new social account", () => {
    expect(source).toMatch(/await sendWelcomeEmail\(user\.email, user\.name\)/);
  });

  it("sends it only where the account is created", () => {
    // It must sit after the create and before that branch closes — not on the
    // link-existing-account path, and not on every later sign-in.
    const createIndex = source.indexOf("user = await prisma.user.create(");
    const welcomeIndex = source.indexOf("sendWelcomeEmail(");
    const payloadIndex = source.indexOf("const payload = { userId: user.id");
    expect(createIndex).toBeGreaterThan(-1);
    expect(welcomeIndex).toBeGreaterThan(createIndex);
    expect(welcomeIndex).toBeLessThan(payloadIndex);
  });

  it("does not send when an existing account is linked to a provider", () => {
    const linkBranch = source.slice(
      source.indexOf("// Existing email/password"),
      source.indexOf("if (!user) {", source.indexOf("// Existing email/password"))
    );
    expect(linkBranch).not.toMatch(/sendWelcomeEmail/);
  });

  it("requests no more Google scope than an account needs", () => {
    // openid + email + profile is the minimum to create an account. Anything
    // beyond it would widen the consent screen for no benefit.
    expect(source).toMatch(/scope: "openid email profile"/);
    expect(source).not.toMatch(/https:\/\/www\.googleapis\.com\/auth\//);
  });
});

describe("order confirmation email", () => {
  const source = read("src/server/orders.ts");

  it("is still awaited and its outcome recorded on the order", () => {
    expect(source).toMatch(/await sendOrderConfirmationEmail\(/);
    expect(source).toMatch(/Order confirmation email FAILED/);
  });

  it("sends exactly one confirmation per order", () => {
    expect(source.match(/sendOrderConfirmationEmail\(/g)).toHaveLength(1);
  });
});

describe("store new-order notification", () => {
  const orders = read("src/server/orders.ts");
  const emailIndex = read("src/server/email/index.ts");

  it("sends exactly one store alert per order", () => {
    expect(orders.match(/sendNewOrderAdminEmail\(/g)).toHaveLength(1);
  });

  it("sends it from the single place an order becomes real", () => {
    // finalizeOrderEffects is the only path a draft/checkout takes to become a
    // live order, so anchoring the alert there is what makes it exactly-once.
    const finalize = orders.slice(orders.indexOf("export async function finalizeOrderEffects"));
    expect(finalize).toMatch(/sendNewOrderAdminEmail\(/);
  });

  it("is awaited, so a serverless teardown cannot discard it", () => {
    expect(orders).toMatch(/await sendNewOrderAdminEmail\(/);
  });

  it("records a failure on the order instead of swallowing it", () => {
    expect(orders).toMatch(/Store new-order alert FAILED/);
  });

  it("does not replace or duplicate the customer confirmation", () => {
    // Different function, different recipient, different subject.
    expect(orders.match(/sendOrderConfirmationEmail\(/g)).toHaveLength(1);
    expect(emailIndex).toMatch(/sendNewOrderAdminEmail[\s\S]*?storeOrderInbox\(\)/);
    expect(emailIndex).toMatch(/`New order \$\{params\.orderNumber\}/);
    expect(emailIndex).toMatch(/`Order Confirmed — \$\{params\.orderNumber\}`/);
  });

  it("goes to the store inbox, not the customer", () => {
    expect(emailIndex).toMatch(/STORE_ORDER_INBOX = "orders@seoulglowbangladesh\.com"/);
    // It must take no recipient argument at all — the address is resolved
    // internally, so no caller can ever aim it at a customer.
    const start = emailIndex.indexOf("export async function sendNewOrderAdminEmail");
    const signature = emailIndex.slice(start, emailIndex.indexOf("{", start));
    expect(signature).toMatch(/^export async function sendNewOrderAdminEmail\(params:/);
    expect(signature).not.toMatch(/\bto\s*:/);
  });

  it("is never sent from a cancel, delete or status-change path", () => {
    for (const file of [
      "src/app/api/admin/orders/[id]/route.ts",
      "src/server/order-notifications.ts",
    ]) {
      expect(read(file), file).not.toMatch(/sendNewOrderAdminEmail/);
    }
  });

  it("cannot fire for a draft, since drafts never reach finalize", () => {
    // createOrderRecord is the draft-safe path and must stay free of sends.
    const create = orders.slice(
      orders.indexOf("export async function createOrderRecord"),
      orders.indexOf("type FinalizableOrder")
    );
    expect(create).not.toMatch(/send[A-Za-z]*Email\(/);
  });
});
