import { describe, it, expect } from "vitest";
import { computeProfit, resolvePeriod, type ProfitInputOrder } from "@/server/finance";
import { parseSpentAt, isOperatingCategory } from "@/lib/expense-categories";

/**
 * Profit is the one number on this dashboard an owner will act on — pricing,
 * ad spend and restocking decisions all hang off it — and it is assembled from
 * four separate inputs that each have a way of going quietly wrong. The query
 * layer needs a database, but the arithmetic does not, so every rule that
 * decides the figure is pinned here.
 */

const order = (
  total: number,
  items: { price: number; quantity: number; costPrice: number | null }[],
  extra: { discount?: number; shippingFee?: number } = {}
): ProfitInputOrder => ({
  total,
  discount: extra.discount ?? 0,
  shippingFee: extra.shippingFee ?? 0,
  items,
});

describe("computeProfit", () => {
  it("subtracts cost of goods from revenue to get gross profit", () => {
    const summary = computeProfit([order(1000, [{ price: 1000, quantity: 1, costPrice: 600 }])], []);
    expect(summary.netRevenue).toBe(1000);
    expect(summary.cogs).toBe(600);
    expect(summary.grossProfit).toBe(400);
  });

  it("subtracts operating expenses from gross profit to get net profit", () => {
    const summary = computeProfit(
      [order(1000, [{ price: 1000, quantity: 1, costPrice: 600 }])],
      [{ category: "SHIPPING", amount: 120 }, { category: "MARKETING", amount: 80 }]
    );
    expect(summary.operatingExpenses).toBe(200);
    expect(summary.netProfit).toBe(200);
  });

  it("multiplies unit cost by quantity, not once per line", () => {
    const summary = computeProfit([order(3000, [{ price: 1000, quantity: 3, costPrice: 600 }])], []);
    expect(summary.cogs).toBe(1800);
    expect(summary.unitsSold).toBe(3);
  });

  /**
   * The double-count guard. A stock purchase is cash leaving the business, but
   * its cost reaches the P&L through COGS as each unit sells. Counting the
   * purchase as an operating expense too would charge the same taka twice and
   * make any month with a restock look like a disaster.
   */
  it("keeps stock purchases out of operating expenses", () => {
    const summary = computeProfit(
      [order(1000, [{ price: 1000, quantity: 1, costPrice: 600 }])],
      [{ category: "INVENTORY", amount: 50000 }, { category: "SHIPPING", amount: 100 }]
    );
    expect(summary.operatingExpenses).toBe(100);
    expect(summary.nonOperatingSpend).toBe(50000);
    // Net profit is unmoved by the restock.
    expect(summary.netProfit).toBe(300);
  });

  it("treats an unrecognised category as operating rather than dropping it", () => {
    // Silently excluding a spend we can't classify would overstate profit, which
    // is the one direction this must never fail in.
    expect(isOperatingCategory("SOMETHING_ADDED_LATER")).toBe(true);
    const summary = computeProfit([], [{ category: "SOMETHING_ADDED_LATER", amount: 500 }]);
    expect(summary.operatingExpenses).toBe(500);
  });

  /**
   * A missing cost must not be read as "this item cost nothing" — that would
   * report 100% margin on it. It is counted separately so the UI can warn that
   * the figure is optimistic.
   */
  it("flags units with no cost instead of treating them as free", () => {
    const summary = computeProfit(
      [
        order(2000, [
          { price: 1000, quantity: 1, costPrice: 600 },
          { price: 1000, quantity: 2, costPrice: null },
        ]),
      ],
      []
    );
    expect(summary.cogs).toBe(600);
    expect(summary.unitsMissingCost).toBe(2);
    expect(summary.unitsSold).toBe(3);
  });

  it("reports a loss as a negative net profit", () => {
    const summary = computeProfit(
      [order(1000, [{ price: 1000, quantity: 1, costPrice: 600 }])],
      [{ category: "MARKETING", amount: 900 }]
    );
    expect(summary.netProfit).toBe(-500);
    expect(summary.netMargin).toBeCloseTo(-50, 5);
  });

  it("measures margin against revenue, and carries discounts through the order total", () => {
    // total is already net of the discount — 1200 of goods, 200 off, 100 delivery.
    const summary = computeProfit(
      [order(1100, [{ price: 1200, quantity: 1, costPrice: 700 }], { discount: 200, shippingFee: 100 })],
      []
    );
    expect(summary.grossSales).toBe(1200);
    expect(summary.discounts).toBe(200);
    expect(summary.shippingCollected).toBe(100);
    expect(summary.netRevenue).toBe(1100);
    expect(summary.grossProfit).toBe(400);
    expect(summary.grossMargin).toBeCloseTo((400 / 1100) * 100, 5);
  });

  it("returns zeroes rather than NaN when nothing has sold", () => {
    const summary = computeProfit([], []);
    expect(summary.netRevenue).toBe(0);
    expect(summary.grossMargin).toBe(0);
    expect(summary.netMargin).toBe(0);
    expect(summary.averageOrderValue).toBe(0);
    expect(summary.profitPerOrder).toBe(0);
    expect(Number.isNaN(summary.netProfit)).toBe(false);
  });

  it("still reports expenses in a period with no sales", () => {
    // An ad-spend-only month is a real loss, not a blank slate.
    const summary = computeProfit([], [{ category: "MARKETING", amount: 2000 }]);
    expect(summary.netProfit).toBe(-2000);
    // No revenue to measure against, so the percentage stays 0 rather than -Infinity.
    expect(summary.netMargin).toBe(0);
  });

  it("averages per order across the whole period", () => {
    const summary = computeProfit(
      [
        order(1000, [{ price: 1000, quantity: 1, costPrice: 400 }]),
        order(3000, [{ price: 3000, quantity: 1, costPrice: 1600 }]),
      ],
      [{ category: "SHIPPING", amount: 200 }]
    );
    expect(summary.orderCount).toBe(2);
    expect(summary.averageOrderValue).toBe(2000);
    // (4000 - 2000 - 200) / 2
    expect(summary.profitPerOrder).toBe(900);
  });
});

describe("parseSpentAt", () => {
  /**
   * The bug this prevents: `new Date("2026-10-01")` is UTC midnight, which for
   * any timezone behind UTC is the 30th of September locally — filing the bill
   * into the wrong month and corrupting that month's profit.
   */
  it("reads a date-only value as a local day, not UTC midnight", () => {
    const d = parseSpentAt("2026-10-01")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October
    expect(d.getDate()).toBe(1);
  });

  it("accepts a full timestamp unchanged", () => {
    const d = parseSpentAt("2026-10-01T08:30:00.000Z")!;
    expect(d.toISOString()).toBe("2026-10-01T08:30:00.000Z");
  });

  it("returns null for junk rather than an Invalid Date", () => {
    expect(parseSpentAt("not a date")).toBeNull();
    expect(parseSpentAt("")).toBeNull();
  });
});

describe("resolvePeriod", () => {
  const now = new Date(2026, 9, 15, 10, 0, 0); // 15 Oct 2026

  it("defaults to the current month", () => {
    const p = resolvePeriod(undefined, now);
    expect(p.value).toBe("month");
    expect(p.from.getMonth()).toBe(9);
    expect(p.from.getDate()).toBe(1);
  });

  it("falls back to the current month for an unknown key", () => {
    expect(resolvePeriod("whatever", now).value).toBe("month");
  });

  it("resolves last month to its own first and last day", () => {
    const p = resolvePeriod("last-month", now);
    expect(p.from.getMonth()).toBe(8); // September
    expect(p.from.getDate()).toBe(1);
    expect(p.to.getMonth()).toBe(8);
    expect(p.to.getDate()).toBe(30); // September has 30 days
  });

  it("counts 30 days inclusive of today", () => {
    const p = resolvePeriod("30d", now);
    expect(p.from.getMonth()).toBe(8);
    expect(p.from.getDate()).toBe(16);
  });

  it("starts the year period on 1 January", () => {
    const p = resolvePeriod("year", now);
    expect(p.from.getFullYear()).toBe(2026);
    expect(p.from.getMonth()).toBe(0);
    expect(p.from.getDate()).toBe(1);
  });
});
