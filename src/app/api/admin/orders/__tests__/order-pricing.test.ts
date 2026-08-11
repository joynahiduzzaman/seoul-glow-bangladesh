import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The discount and the courier charge are the two numbers an admin can change
 * on an order after it exists, and both move the amount a customer is asked to
 * pay. The rules that keep that safe are easy to delete by accident and none of
 * them fail loudly:
 *
 *   - the total is recomputed on the server, never accepted from the browser;
 *   - a discount can bring an order to zero but never below;
 *   - a settled order (delivered, returned, refunded, cancelled) is frozen;
 *   - every change is written to the order's timeline with who made it.
 *
 * Source checks: each rule is a line that either exists or doesn't.
 */
const route = readFileSync(
  path.join(process.cwd(), "src/app/api/admin/orders/[id]/route.ts"),
  "utf8"
);

describe("editing an order's discount and courier charge", () => {
  it("accepts both fields", () => {
    expect(route).toMatch(/discount:\s*z\.number\(\)\.min\(0\)/);
    expect(route).toMatch(/shippingFee:\s*z\.number\(\)\.min\(0\)/);
  });

  it("recomputes the total server-side rather than trusting the client", () => {
    expect(route).toMatch(/data\.total\s*=\s*Math\.max\(\s*0,\s*existing\.subtotal/);
    // A `total` in the request body must never reach Prisma.
    expect(route).not.toMatch(/total:\s*z\.number/);
  });

  it("never lets a discount push an order below zero", () => {
    expect(route).toMatch(/discount > existing\.subtotal \+ shippingFee/);
    expect(route).toMatch(/Math\.max\(0,/);
  });

  it("freezes the total once the order is settled", () => {
    expect(route).toMatch(/PRICE_LOCKED_STATUSES/);
    for (const status of ["DELIVERED", "RETURNED", "REFUNDED", "CANCELLED"]) {
      expect(route, `${status} must be price-locked`).toMatch(new RegExp(`"${status}"`));
    }
  });

  it("writes the before and after to the order timeline", () => {
    expect(route).toMatch(/logOrderEvent\(/);
    expect(route).toMatch(/existing\.discount/);
    expect(route).toMatch(/existing\.shippingFee/);
    // admin.name is what puts a person's name against the change.
    const block = route.slice(route.indexOf("if (changingMoney)"));
    expect(block).toMatch(/admin\.name/);
  });

  it("stays behind the same staff-only guard as the rest of the route", () => {
    expect(route).toMatch(/requireAdmin\(\)/);
    expect(route).toMatch(/\["ADMIN", "MANAGER", "STAFF"\]/);
  });
});

describe("recording a manual order", () => {
  const form = readFileSync(path.join(process.cwd(), "src/components/admin/ManualOrderForm.tsx"), "utf8");

  it("sends an explicit zero when the courier charge is switched off", () => {
    // `undefined` means "use the zone rate" on the server, which is the
    // opposite of waiving the charge — the distinction is the whole feature.
    expect(form).toMatch(/!applyCourierCharge \? 0 :/);
  });

  it("applies the courier charge by default", () => {
    expect(form).toMatch(/useState\(true\)/);
  });
});
