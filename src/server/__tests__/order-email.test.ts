import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Order SGB260805-8994 completed, showed "Order confirmed", and sent nothing.
 * The send was attempted and rejected by the provider, but the call site used
 * `.catch(() => {})`, so the failure left no trace on the order, in the logs, or
 * anywhere an admin could see. The checkout looked perfectly healthy.
 *
 * Two properties keep that from recurring, and both are structural rather than
 * behavioural — they are asserted against the source because the failure mode
 * was the *absence* of handling, which a mock-based test would not have caught
 * either.
 */
const source = readFileSync(path.resolve(process.cwd(), "src/server/orders.ts"), "utf8");

describe("order confirmation email is sent and its outcome recorded", () => {
  it("awaits the send rather than firing and forgetting", () => {
    // On serverless the execution context can be frozen once the response is
    // returned, so an un-awaited request to the mail provider may never finish.
    expect(source).toMatch(/await sendOrderConfirmationEmail\(/);
  });

  it("never discards the result with an empty catch", () => {
    // Comments are stripped first: the fix's own explanation quotes the old
    // `.catch(() => {})`, and matching that would fail the test for describing
    // the very bug it prevents.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(code).not.toMatch(/\.catch\(\(\)\s*=>\s*\{\s*\}\)/);
    // The handler must actually produce a result the caller can inspect.
    expect(code).toMatch(/sendOrderConfirmationEmail\([\s\S]*?\.catch\(\(err\)/);
  });

  it("records both success and failure on the order timeline", () => {
    // A rejected send must be visible to an admin looking at the order.
    expect(source).toMatch(/confirmation email FAILED/i);
    expect(source).toMatch(/Order confirmation emailed to/i);
    expect(source).toMatch(/logOrderEvent\(/);
  });

  it("still guards against an order with no email address", () => {
    expect(source).toMatch(/const recipientEmail = fullUser\?\.email \|\| order\.guestEmail/);
    expect(source).toMatch(/No email address on this order/i);
  });
});
