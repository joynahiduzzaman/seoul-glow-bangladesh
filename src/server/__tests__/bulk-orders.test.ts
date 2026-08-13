import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ORDER_STATUSES, STATUS_TRANSITIONS, canTransitionStatus, nextForwardStatus, forwardPathBetween, reachableStatuses } from "@/lib/order-status";

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

describe("jumping several statuses at once", () => {
  it("crosses every step in between, in pipeline order", () => {
    expect(forwardPathBetween("CONFIRMED", "SHIPPED")).toEqual(["PACKED", "SHIPPED"]);
    expect(forwardPathBetween("PENDING", "DELIVERED")).toEqual(["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]);
    expect(forwardPathBetween("PACKED", "SHIPPED")).toEqual(["SHIPPED"]);
  });

  it("never routes through a terminal status on the way", () => {
    for (const to of ["DELIVERED", "SHIPPED", "PACKED"]) {
      for (const from of ["PENDING", "CONFIRMED", "PACKED"]) {
        const path = forwardPathBetween(from, to);
        expect(path, `${from} -> ${to}`).not.toContain("CANCELLED");
        expect(path, `${from} -> ${to}`).not.toContain("RETURNED");
        expect(path, `${from} -> ${to}`).not.toContain("REFUNDED");
      }
    }
  });

  it("refuses to walk backwards or sideways", () => {
    expect(forwardPathBetween("DELIVERED", "PENDING")).toEqual([]);
    expect(forwardPathBetween("SHIPPED", "CONFIRMED")).toEqual([]);
    // Cancel is a single legal transition, not a path — it falls through to the
    // one-step function, which validates it properly.
    expect(forwardPathBetween("CONFIRMED", "CANCELLED")).toEqual([]);
    expect(forwardPathBetween("CONFIRMED", "CONFIRMED")).toEqual([]);
  });

  it("never offers a path out of a draft", () => {
    // Confirming a draft reserves stock; only the confirm route does that.
    for (const to of ORDER_STATUSES) expect(forwardPathBetween("DRAFT", to), to).toEqual([]);
  });

  it("every step of a path is a transition the status table allows", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const path = forwardPathBetween(from, to);
        let cur = from;
        for (const step of path) {
          expect(canTransitionStatus(cur, step), `${cur} -> ${step}`).toBe(true);
          cur = step;
        }
      }
    }
  });

  it("offers the whole forward line plus the terminal actions", () => {
    const fromConfirmed = reachableStatuses("CONFIRMED");
    expect(fromConfirmed).toContain("PACKED");
    expect(fromConfirmed).toContain("SHIPPED");
    expect(fromConfirmed).toContain("DELIVERED");
    expect(fromConfirmed).toContain("CANCELLED");
    // No duplicates — PACKED is both the next step and a legal transition.
    expect(new Set(fromConfirmed).size).toBe(fromConfirmed.length);
  });

  it("never offers the status an order is already on", () => {
    for (const s of ORDER_STATUSES) expect(reachableStatuses(s), s).not.toContain(s);
  });
});

describe("walking a path notifies once", () => {
  const service = read("src/server/order-status-change.ts");

  it("suppresses the customer email on every step but the last", () => {
    // Three emails in the same second about the same parcel is worse than one.
    expect(service).toMatch(/notify: isLast/);
    expect(service).toMatch(/if \(notify\)/);
  });

  it("still writes a timeline entry for every step", () => {
    // The audit trail has to show the order really was packed.
    const step = service.slice(service.indexOf("export async function applyOrderStatusChange"));
    expect(step).toMatch(/logOrderEvent\(orderId, "STATUS_CHANGE"/);
  });

  it("stops at the first failure and reports how far it got", () => {
    expect(service).toMatch(/Moved as far as/);
  });
});
