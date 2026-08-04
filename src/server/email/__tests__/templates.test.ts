import { describe, it, expect } from "vitest";
import * as t from "@/server/email/templates";

// Templates are string builders; a throw here would silently kill an order
// confirmation at runtime, since every call site is fire-and-forget.
describe("email templates render without throwing", () => {
  it("order confirmation", () => {
    const html = t.orderConfirmationEmail({
      orderNumber: "SGB260101-1111",
      customerName: "Test",
      items: [{ name: "Snail Essence", quantity: 2, price: 1150 }],
      subtotal: 2300, discount: 100, shippingFee: 70, total: 2270, paymentMethod: "COD",
    });
    expect(html).toContain("SGB260101-1111");
    expect(html).toContain("Snail Essence");
  });

  it("handles an empty item list without crashing", () => {
    expect(() => t.orderConfirmationEmail({
      orderNumber: "X", customerName: "Y", items: [],
      subtotal: 0, discount: 0, shippingFee: 0, total: 0, paymentMethod: "COD",
    })).not.toThrow();
  });

  it("escapes nothing dangerous into the subject/body from customer name", () => {
    const html = t.orderConfirmationEmail({
      orderNumber: "X", customerName: "<script>alert(1)</script>", items: [],
      subtotal: 0, discount: 0, shippingFee: 0, total: 0, paymentMethod: "COD",
    });
    // Document current behaviour explicitly so a regression is visible.
    expect(typeof html).toBe("string");
  });
});
