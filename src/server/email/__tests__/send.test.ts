import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Email is fire-and-forget at every call site: registration, checkout and the
 * abandoned-cart cron all send without awaiting a usable result. So the contract
 * that matters is that send() *never throws* — a customer who completed checkout
 * must not see an error because the mail API had a bad minute.
 */

const ORIGINAL = { ...process.env };
const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

async function freshModule() {
  vi.resetModules();
  return import("../index");
}

beforeEach(() => {
  sendMock.mockReset();
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("email send", () => {
  it("logs instead of sending when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const mail = await freshModule();

    const result = await mail.sendWelcomeEmail("someone@example.com", "Test");

    expect(result.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).toMatch(/not-configured/);
    log.mockRestore();
  });

  it("sends through Resend when configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key_value";
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    const mail = await freshModule();

    const result = await mail.sendWelcomeEmail("someone@example.com", "Test");

    expect(result.sent).toBe(true);
    expect(result.id).toBe("abc-123");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toBe("someone@example.com");
    expect(payload.from).toContain("@");
    expect(payload.html).toContain("<!DOCTYPE");
  });

  it("returns sent:false when Resend reports an API error, without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key_value";
    // The SDK surfaces API problems in `error` rather than by rejecting.
    sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "bad sender" } });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const mail = await freshModule();

    const result = await mail.sendPasswordResetEmail("x@example.com", "X", "https://example.com/r");

    expect(result.sent).toBe(false);
    expect(result.error).toBeTruthy();
    err.mockRestore();
  });

  it("swallows a thrown network error so checkout is never blocked", async () => {
    process.env.RESEND_API_KEY = "re_test_key_value";
    sendMock.mockRejectedValue(new Error("ECONNRESET"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const mail = await freshModule();

    await expect(
      mail.sendOrderConfirmationEmail("buyer@example.com", {
        orderNumber: "SGB260101-0001",
        customerName: "Buyer",
        items: [{ name: "Serum", quantity: 1, price: 1000 }],
        subtotal: 1000, discount: 0, shippingFee: 70, total: 1070, paymentMethod: "COD",
      })
    ).resolves.toMatchObject({ sent: false });

    err.mockRestore();
  });

  it("treats a blank API key as unconfigured", async () => {
    process.env.RESEND_API_KEY = "   ";
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const mail = await freshModule();

    expect((await mail.sendWelcomeEmail("a@b.com", "A")).sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
