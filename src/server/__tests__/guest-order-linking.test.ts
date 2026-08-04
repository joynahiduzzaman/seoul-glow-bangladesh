import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const updateMany = vi.fn();
vi.mock("../db", () => ({
  prisma: {
    order: { findMany: (...args: any[]) => findMany(...args), updateMany: (...args: any[]) => updateMany(...args) },
  },
}));

const logOrderEvent = vi.fn();
vi.mock("../order-events", () => ({ logOrderEvent: (...args: any[]) => logOrderEvent(...args) }));

// Only imported after the mocks above so orders.ts picks up the mocked modules.
import { linkGuestOrdersToAccount } from "../orders";

describe("linkGuestOrdersToAccount", () => {
  beforeEach(() => {
    findMany.mockReset();
    updateMany.mockReset();
    logOrderEvent.mockReset();
  });

  it("fetches all unclaimed guest orders, scoped to userId: null", async () => {
    findMany.mockResolvedValue([]);
    await linkGuestOrdersToAccount("user-1", "jane@example.com");
    expect(findMany).toHaveBeenCalledWith({ where: { userId: null }, select: { id: true, guestEmail: true, shippingPhone: true } });
  });

  it("matches unclaimed guest orders by exact email and links them to the new account", async () => {
    findMany.mockResolvedValue([
      { id: "order-1", guestEmail: "jane@example.com", shippingPhone: "01700000001" },
      { id: "order-2", guestEmail: "jane@example.com", shippingPhone: "01700000002" },
      { id: "order-3", guestEmail: "someone-else@example.com", shippingPhone: "01700000003" },
    ]);
    updateMany.mockResolvedValue({ count: 2 });

    const linked = await linkGuestOrdersToAccount("user-1", "jane@example.com");

    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["order-1", "order-2"] } }, data: { userId: "user-1" } });
    expect(logOrderEvent).toHaveBeenCalledTimes(2);
    expect(logOrderEvent).toHaveBeenCalledWith("order-1", "NOTE", "Linked to a newly created customer account", "System");
    expect(linked).toBe(2);
  });

  // The register form sends a bare local number ("1712345678", split from a
  // fixed "+880" prefix), while checkout stores whatever the shopper typed at
  // checkout ("01712345678"). These must still match — this is the exact
  // scenario the phone-format-mismatch bug looked like before normalizePhone
  // was applied on both sides.
  it("matches by phone even when the stored and provided formats differ", async () => {
    findMany.mockResolvedValue([{ id: "order-1", guestEmail: "other@example.com", shippingPhone: "01712345678" }]);
    updateMany.mockResolvedValue({ count: 1 });

    const linked = await linkGuestOrdersToAccount("user-1", "jane@example.com", "1712345678");

    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["order-1"] } }, data: { userId: "user-1" } });
    expect(linked).toBe(1);
  });

  it("also matches a +880-prefixed phone against a 01-prefixed stored number", async () => {
    findMany.mockResolvedValue([{ id: "order-1", guestEmail: "other@example.com", shippingPhone: "01712345678" }]);
    updateMany.mockResolvedValue({ count: 1 });

    const linked = await linkGuestOrdersToAccount("user-1", "jane@example.com", "+8801712345678");
    expect(linked).toBe(1);
  });

  it("does not match on phone when no phone is given, even if one order's phone happens to be empty-equivalent", async () => {
    findMany.mockResolvedValue([{ id: "order-1", guestEmail: "other@example.com", shippingPhone: "01712345678" }]);
    const linked = await linkGuestOrdersToAccount("user-1", "jane@example.com", null);
    expect(linked).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 0 and skips updateMany entirely when nothing matches", async () => {
    findMany.mockResolvedValue([]);
    const linked = await linkGuestOrdersToAccount("user-1", "nobody@example.com");
    expect(linked).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("never throws — swallows a DB failure and returns 0", async () => {
    findMany.mockRejectedValue(new Error("DB is down"));
    const linked = await linkGuestOrdersToAccount("user-1", "jane@example.com");
    expect(linked).toBe(0);
  });
});
