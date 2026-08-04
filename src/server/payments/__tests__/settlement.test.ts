import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory order used by the mocked Prisma client below.
let order: any;
const created: any[] = [];
const events: string[] = [];

vi.mock("@/server/db", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(async ({ where }: any) => (where.orderNumber === order.orderNumber ? { ...order } : null)),
      update: vi.fn(async ({ data }: any) => {
        order = { ...order, ...data };
        return order;
      }),
    },
    payment: {
      findFirst: vi.fn(async () => created.find((p) => p.transactionId === "dup") ?? null),
      create: vi.fn(async ({ data }: any) => {
        created.push(data);
        return data;
      }),
    },
  },
}));

vi.mock("@/server/order-events", () => ({
  logOrderEvent: vi.fn(async (_id: string, _t: string, msg: string) => {
    events.push(msg);
  }),
}));

const { markOrderPaid, markOrderPaymentFailed } = await import("../confirm");

beforeEach(() => {
  order = {
    id: "o1",
    orderNumber: "SGB260101-1111",
    total: 1220,
    paymentStatus: "PENDING",
    status: "PENDING",
    paymentMethod: "SSLCOMMERZ",
    gatewayTransactionId: null,
  };
  created.length = 0;
  events.length = 0;
});

describe("markOrderPaid — settlement guards", () => {
  it("settles when the gateway's amount and order reference both check out", async () => {
    const r = await markOrderPaid("SGB260101-1111", {
      amount: "1220.00",
      gatewayOrderRef: "SGB260101-1111",
      transactionId: "tx1",
    });
    expect(r.ok).toBe(true);
    expect(order.paymentStatus).toBe("PAID");
    expect(created[0].amount).toBe(1220);
  });

  it("REFUSES a reference borrowed from another order (unbound settlement)", async () => {
    // The exact attack: a valid reference from the attacker's own ৳1 order,
    // replayed against someone else's order number.
    const r = await markOrderPaid("SGB260101-1111", {
      amount: "1220.00",
      gatewayOrderRef: "SGB260101-9999",
    });
    expect(r).toEqual({ ok: false, reason: "order_mismatch" });
    expect(order.paymentStatus).toBe("PENDING");
    expect(created).toHaveLength(0);
    expect(events.join(" ")).toMatch(/REFUSED/);
  });

  it("REFUSES a capture short of the order total (amount tampering)", async () => {
    const r = await markOrderPaid("SGB260101-1111", { amount: "1.00", gatewayOrderRef: "SGB260101-1111" });
    expect(r).toEqual({ ok: false, reason: "amount_mismatch" });
    expect(order.paymentStatus).toBe("PENDING");
  });

  it("REFUSES when the gateway reports no usable amount", async () => {
    expect(await markOrderPaid("SGB260101-1111", { amount: undefined })).toEqual({ ok: false, reason: "no_amount" });
    expect(await markOrderPaid("SGB260101-1111", { amount: "not-a-number" })).toEqual({ ok: false, reason: "no_amount" });
    expect(order.paymentStatus).toBe("PENDING");
  });

  it("tolerates sub-taka formatting differences", async () => {
    const r = await markOrderPaid("SGB260101-1111", { amount: "1219.7" });
    expect(r.ok).toBe(true);
  });

  it("accepts an overpayment rather than blocking the customer", async () => {
    const r = await markOrderPaid("SGB260101-1111", { amount: "1300" });
    expect(r.ok).toBe(true);
  });

  it("is idempotent — a replayed callback does not double-post the ledger", async () => {
    await markOrderPaid("SGB260101-1111", { amount: "1220", transactionId: "tx1" });
    await markOrderPaid("SGB260101-1111", { amount: "1220", transactionId: "tx1" });
    expect(created).toHaveLength(1);
  });

  it("returns not_found for an unknown order", async () => {
    expect(await markOrderPaid("SGB999999-0000", { amount: "1220" })).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("markOrderPaymentFailed", () => {
  it("never downgrades an order that is already PAID", async () => {
    await markOrderPaid("SGB260101-1111", { amount: "1220" });
    expect(order.paymentStatus).toBe("PAID");
    await markOrderPaymentFailed("SGB260101-1111");
    // A late cancel/fail redirect must not un-pay a settled order.
    expect(order.paymentStatus).toBe("PAID");
  });

  it("marks an unsettled order as failed", async () => {
    await markOrderPaymentFailed("SGB260101-1111");
    expect(order.paymentStatus).toBe("FAILED");
  });
});
