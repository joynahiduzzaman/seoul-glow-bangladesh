import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { nextForwardStatus } from "@/server/order-status-change";
import { ORDER_STATUSES, STATUS_TRANSITIONS, canTransitionStatus } from "@/lib/order-status";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), "utf8");

/**
 * Bulk actions repeat a write across up to a hundred orders. Every rule that
 * protects a single order has to hold a hundred times, and the failure mode
 * when one doesn't is silent: inventory drifts, commissions linger, customers
 * get an email about a status their order never reached.
 */
describe("moving an order one step forward", () => {
  it("only ever moves forward", () => {
    // Every status also lists CANCELLED or RETURNED as a legal transition. A
    // "next status" that picked the first entry would cancel a batch of orders.
    for (const from of ORDER_STATUSES) {
      const to = nextForwardStatus(from);
      if (to) expect(["CANCELLED", "RETURNED", "REFUNDED"], `${from} -> ${to}`).not.toContain(to);
    }
  });

  it("only proposes transitions the status table actually allows", () => {
    for (const from of ORDER_STATUSES) {
      const to = nextForwardStatus(from);
      if (to) expect(canTransitionStatus(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it("stops at the end of the line", () => {
    for (const status of ["DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"]) {
      expect(nextForwardStatus(status), status).toBeNull();
    }
  });

  it("never advances a draft", () => {
    // Confirming a draft reserves stock, which only the confirm route does.
    expect(nextForwardStatus("DRAFT")).toBeNull();
    expect(STATUS_TRANSITIONS.DRAFT).toContain("PENDING");
  });

  it("walks the whole happy path one step at a time", () => {
    const path_: string[] = ["PENDING"];
    let cur: string | null = "PENDING";
    while ((cur = nextForwardStatus(cur!))) path_.push(cur);
    expect(path_).toEqual(["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]);
  });
});

describe("the bulk endpoint cannot take shortcuts", () => {
  const bulk = read("src/app/api/admin/orders/bulk/route.ts");
  const service = read("src/server/order-status-change.ts");

  it("changes each status through the shared service, not a mass update", () => {
    expect(bulk).toMatch(/applyOrderStatusChange\(/);
    // updateMany on status would skip stock, commissions, timeline and email.
    expect(bulk).not.toMatch(/updateMany\([^)]*status:\s*(status|toStatus)/);
  });

  it("de-duplicates ids so one order can't be processed twice in a request", () => {
    expect(bulk).toMatch(/new Set\(parsed\.data\.ids\)/);
  });

  it("caps how many orders one request can touch", () => {
    expect(bulk).toMatch(/MAX_BULK/);
  });

  it("reports what it skipped instead of failing the batch", () => {
    expect(bulk).toMatch(/skipped/);
    expect(bulk).toMatch(/details/);
  });

  it("refuses to ship an order that isn't going anywhere", () => {
    expect(bulk).toMatch(/CANCELLED", "RETURNED", "REFUNDED", "DRAFT"/);
  });

  it("is staff-only, like every other admin route", () => {
    expect(bulk).toMatch(/\["ADMIN", "MANAGER", "STAFF"\]/);
  });
});

describe("the status service guards against double-application", () => {
  const service = read("src/server/order-status-change.ts");

  it("claims the order with a compare-and-set before doing anything", () => {
    // Without this, the same order twice in one batch — or two admins at once —
    // would both pass the guard and both restock it.
    expect(service).toMatch(/updateMany\(\{\s*where: \{ id: orderId, status: existing\.status \}/);
    expect(service).toMatch(/res\.count === 1/);
  });

  it("runs side effects only after the write is committed", () => {
    expect(service.indexOf("claimed")).toBeLessThan(service.indexOf("adjustStock("));
  });

  it("refuses to turn a draft into a live order", () => {
    expect(service).toMatch(/existing\.status === "DRAFT"/);
  });
});

describe("the print routes are behind the admin guard", () => {
  const middleware = read("src/middleware.ts");

  it("covers /admin-print and /admin-preview-frame, not just /admin", () => {
    // `/admin/:path*` matches children of /admin only. /admin-print is a
    // sibling segment, so middleware never ran for it, and an invoice — a
    // customer's name, phone, address and order contents — was readable by
    // anyone holding the order id, with no session.
    expect(middleware).toMatch(/"\/admin-print\/:path\*"/);
    expect(middleware).toMatch(/"\/admin-preview-frame\/:path\*"/);
    expect(middleware).toMatch(/"\/admin\/:path\*"/);
  });

  it("still checks the same three roles it always did", () => {
    expect(middleware).toMatch(/\["ADMIN", "MANAGER", "STAFF"\]/);
  });
});
