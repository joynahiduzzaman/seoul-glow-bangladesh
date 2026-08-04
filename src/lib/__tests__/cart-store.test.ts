// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "../cart-store";

const sampleItem = {
  productId: "prod_1",
  name: "Snail Mucin Essence",
  slug: "snail-mucin-essence",
  image: "https://example.com/img.jpg",
  price: 1000,
  quantity: 1,
  stock: 10,
};

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe("useCartStore", () => {
  it("adds a new item to an empty cart", () => {
    useCartStore.getState().addItem(sampleItem);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("increments quantity when adding the same product again", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().addItem({ ...sampleItem, quantity: 2 });
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("never lets quantity exceed available stock", () => {
    useCartStore.getState().addItem({ ...sampleItem, stock: 5, quantity: 3 });
    useCartStore.getState().addItem({ ...sampleItem, stock: 5, quantity: 10 });
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("removes an item by productId", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().removeItem(sampleItem.productId);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("updateQuantity clamps between 1 and stock", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().updateQuantity(sampleItem.productId, 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    useCartStore.getState().updateQuantity(sampleItem.productId, 999);
    expect(useCartStore.getState().items[0].quantity).toBe(sampleItem.stock);
  });

  it("subtotal() sums price × quantity across all items", () => {
    useCartStore.getState().addItem({ ...sampleItem, productId: "a", price: 500, quantity: 2 });
    useCartStore.getState().addItem({ ...sampleItem, productId: "b", price: 300, quantity: 1 });
    expect(useCartStore.getState().subtotal()).toBe(500 * 2 + 300 * 1);
  });

  it("totalItems() sums quantities across all items", () => {
    useCartStore.getState().addItem({ ...sampleItem, productId: "a", quantity: 2 });
    useCartStore.getState().addItem({ ...sampleItem, productId: "b", quantity: 3 });
    expect(useCartStore.getState().totalItems()).toBe(5);
  });

  it("clear() empties the cart", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
