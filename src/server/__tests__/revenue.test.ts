import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  REVENUE_STATUSES,
  PIPELINE_STATUSES,
  ORDER_STATUSES,
  countsAsRevenue,
} from "@/lib/order-status";

/**
 * A cancelled order kept counting toward Total Revenue forever. The cause was
 * three independent definitions of "revenue": the dashboard summed everything
 * except DRAFT, the orders page excluded DRAFT/CANCELLED/REFUNDED, and a
 * customer's total spent keyed off paymentStatus. Whichever was loosest set what
 * an admin saw.
 */
describe("revenue recognition rule", () => {
  it("counts delivered orders", () => {
    expect(countsAsRevenue("DELIVERED")).toBe(true);
  });

  it("excludes every status that is not a completed sale", () => {
    for (const status of ["DRAFT", "CANCELLED", "RETURNED", "REFUNDED"]) {
      expect(countsAsRevenue(status), status).toBe(false);
    }
  });

  it("excludes sold-but-not-yet-delivered orders from earnings", () => {
    // Cash on Delivery: nothing is collected until the courier hands it over.
    for (const status of ["PENDING", "CONFIRMED", "PACKED", "SHIPPED"]) {
      expect(countsAsRevenue(status), status).toBe(false);
    }
  });

  it("never treats a status as both earned and pipeline", () => {
    const overlap = REVENUE_STATUSES.filter((s) => PIPELINE_STATUSES.includes(s));
    expect(overlap).toEqual([]);
  });

  it("forces a decision when a new status is added", () => {
    // Any status not classified as earned, pipeline, or explicitly excluded
    // would silently default to "not revenue" — fine today, but only by luck.
    const EXCLUDED = ["DRAFT", "CANCELLED", "RETURNED", "REFUNDED"];
    const classified = new Set([...REVENUE_STATUSES, ...PIPELINE_STATUSES, ...EXCLUDED]);
    const unclassified = ORDER_STATUSES.filter((s) => !classified.has(s));
    expect(
      unclassified,
      `These order statuses are not classified for revenue. Add each to ` +
        `REVENUE_STATUSES, PIPELINE_STATUSES, or the excluded list in this test:\n  ${unclassified.join(", ")}`
    ).toEqual([]);
  });
});

/**
 * The rule only holds if nothing computes revenue on its own. This is the guard
 * that actually prevents recurrence — the original bug was not a wrong filter so
 * much as four places each free to invent one.
 */
describe("no page computes revenue independently", () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__tests__") continue;
        walk(p, acc);
      } else if (/\.tsx?$/.test(e.name)) acc.push(p);
    }
    return acc;
  }

  const files = [
    ...walk(path.resolve(process.cwd(), "src/app")),
    ...walk(path.resolve(process.cwd(), "src/server")),
  ].filter((f) => !f.includes("revenue.ts"));

  it("sums order totals only through server/revenue.ts", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      src.split(/\r?\n/).forEach((line, i) => {
        // An aggregate summing order.total that does not reference the shared
        // filter is a private definition of revenue.
        const sumsOrderTotal = /order\.aggregate\(/.test(line) && /_sum:\s*\{\s*total:\s*true/.test(line);
        if (sumsOrderTotal && !/revenueWhere|pipelineWhere/.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        }
      });
    }
    expect(
      offenders,
      `These compute revenue with their own filter instead of revenueWhere from ` +
        `server/revenue.ts, which is how a cancelled order counted in one place ` +
        `and not another:\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
  });

  it("never groups OrderItems without constraining order status", () => {
    // Not every grouping is a sales ranking — inventory.ts groups the same table
    // by RESERVED_STATUSES to compute in-flight stock, which is a legitimately
    // different rule. What must never happen is grouping with no status filter
    // at all, because then a cancelled order's contents still count.
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/orderItem\.groupBy\(\{[\s\S]{0,400}?\}\)/g)) {
        const hasStatusFilter = /revenueWhere|pipelineWhere|order:\s*\{[\s\S]*?status/.test(m[0]);
        if (!hasStatusFilter) {
          const line = src.slice(0, m.index).split(/\r?\n/).length;
          offenders.push(`${path.relative(process.cwd(), file)}:${line}`);
        }
      }
    }
    expect(
      offenders,
      `These group OrderItems with no order-status filter, so a cancelled ` +
        `order's contents still count:\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
  });
});

/**
 * Affiliate commissions are the same defect one table over, and worse: revenue
 * was merely displayed wrongly, whereas a commission is money owed to a real
 * person. One was written at order placement and never reversed, so cancelling
 * an order left the payout obligation standing forever.
 *
 * Commission.orderId is a plain column rather than a relation, so this cannot be
 * a query filter like revenueWhere — it has to be maintained on the transition,
 * which is what these assert.
 */
describe("affiliate commissions follow the order's fate", () => {
  const handler = readFileSync(
    path.resolve(process.cwd(), "src/app/api/admin/orders/[id]/route.ts"),
    "utf8"
  );
  const commissions = readFileSync(path.resolve(process.cwd(), "src/server/commissions.ts"), "utf8");

  it("syncs commissions whenever an order's status changes", () => {
    expect(handler).toMatch(/syncCommissionsForOrderStatus\(/);
  });

  it("voids on cancellation and reinstates on reactivation", () => {
    expect(commissions).toMatch(/status: VOID/);
    expect(commissions).toMatch(/status: PENDING/);
  });

  it("never silently voids a commission that was already paid out", () => {
    // That money has left the business; hiding it would conceal a real loss.
    expect(commissions).toMatch(/already PAID/i);
    expect(commissions).toMatch(/updateMany\(\{\s*where: \{ orderId, status: PENDING \}/);
  });

  it("excludes voided commissions from affiliate totals", () => {
    for (const f of ["src/app/admin/affiliates/page.tsx", "src/app/api/account/referrals/route.ts"]) {
      expect(readFileSync(path.resolve(process.cwd(), f), "utf8"), f).toMatch(/payableCommissionWhere/);
    }
  });
});

/**
 * The orders page shows Total Revenue and Pending Collection side by side. The
 * whole point is that they are two different rules — the moment either one is
 * re-derived locally instead of imported, they can drift apart, which is the
 * exact defect the shared module above was created to end.
 */
describe("the orders page reports both figures from the shared rules", () => {
  const page = readFileSync(path.join(process.cwd(), "src/app/admin/orders/page.tsx"), "utf8");

  it("imports both filters rather than listing statuses inline", () => {
    expect(page).toMatch(/import \{[^}]*revenueWhere[^}]*pipelineWhere[^}]*\} from "@\/server\/revenue"/);
  });

  it("sums Pending Collection with the pipeline filter", () => {
    expect(page).toMatch(/aggregate\(\{\s*where: pipelineWhere/);
    expect(page).toMatch(/label: "Pending Collection"/);
  });

  it("keeps Total Revenue on the delivered-only filter", () => {
    expect(page).toMatch(/aggregate\(\{ where: revenueWhere/);
  });

  it("says on the card what Total Revenue counts", () => {
    // BDT 0 next to real orders reads as "nothing sold" without this.
    expect(page).toMatch(/hint: "Delivered orders only"/);
  });

  it("never adds the two together", () => {
    expect(page).not.toMatch(/pipelineTotal \+ .*revenueAgg|revenueAgg[^;]*\+ pipelineTotal/);
  });
});

describe("the two figures cannot overlap", () => {
  it("no status is both earned revenue and pending collection", () => {
    // If one ever appeared in both, the same money would be counted twice on
    // the same screen.
    const both = REVENUE_STATUSES.filter((s) => PIPELINE_STATUSES.includes(s));
    expect(both).toEqual([]);
  });

  it("every status is accounted for as revenue, pipeline, or neither on purpose", () => {
    const neither = ORDER_STATUSES.filter(
      (s) => !REVENUE_STATUSES.includes(s) && !PIPELINE_STATUSES.includes(s)
    );
    // Draft was never confirmed; the other three are terminal non-sales.
    expect(neither.sort()).toEqual(["CANCELLED", "DRAFT", "REFUNDED", "RETURNED"]);
  });
});
