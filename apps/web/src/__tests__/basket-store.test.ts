import { describe, it, expect, beforeEach } from "vitest";
import { useBasketStore } from "../stores/basket.js";

// Reset store state between tests
beforeEach(() => {
  useBasketStore.setState({ items: [] });
});

const PRODUCT_A = { productId: "uuid-product-a", name: "Vollmilch" };
const PRODUCT_B = { productId: "uuid-product-b", name: "Butter" };
const PRODUCT_C = { productId: "uuid-product-c", name: "Brot" };

describe("useBasketStore — addItem", () => {
  it("adds a new item with quantity 1", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: PRODUCT_A.productId, name: PRODUCT_A.name, quantity: 1 });
  });

  it("increments quantity when item already exists", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("adds multiple distinct items independently", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(2);
  });

  it("preserves existing items when adding a new one", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);

    const { items } = useBasketStore.getState();
    const itemA = items.find((i) => i.productId === PRODUCT_A.productId);
    const itemB = items.find((i) => i.productId === PRODUCT_B.productId);
    expect(itemA?.quantity).toBe(2);
    expect(itemB?.quantity).toBe(1);
  });
});

describe("useBasketStore — removeItem", () => {
  it("removes an item by productId", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);
    useBasketStore.getState().removeItem(PRODUCT_A.productId);

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(PRODUCT_B.productId);
  });

  it("does nothing when removing a non-existent item", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().removeItem("non-existent-id");

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(1);
  });

  it("empties the list when the last item is removed", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().removeItem(PRODUCT_A.productId);

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(0);
  });
});

describe("useBasketStore — updateQuantity", () => {
  it("updates quantity for an existing item", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 5);

    const { items } = useBasketStore.getState();
    expect(items[0].quantity).toBe(5);
  });

  it("does not update quantity below 1", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 0);

    const { items } = useBasketStore.getState();
    expect(items[0].quantity).toBe(1); // unchanged
  });

  it("does not update quantity above 99", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 100);

    const { items } = useBasketStore.getState();
    expect(items[0].quantity).toBe(1); // unchanged
  });

  it("allows quantity of exactly 99", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 99);

    const { items } = useBasketStore.getState();
    expect(items[0].quantity).toBe(99);
  });

  it("only updates the targeted item", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 7);

    const { items } = useBasketStore.getState();
    const itemB = items.find((i) => i.productId === PRODUCT_B.productId);
    expect(itemB?.quantity).toBe(1); // untouched
  });
});

describe("useBasketStore — clear", () => {
  it("removes all items", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);
    useBasketStore.getState().addItem(PRODUCT_C.productId, PRODUCT_C.name);
    useBasketStore.getState().clear();

    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(0);
  });

  it("is safe to call on an already-empty store", () => {
    useBasketStore.getState().clear();
    const { items } = useBasketStore.getState();
    expect(items).toHaveLength(0);
  });
});

describe("useBasketStore — getItemCount", () => {
  it("returns 0 for empty store", () => {
    expect(useBasketStore.getState().getItemCount()).toBe(0);
  });

  it("returns total quantity across all items", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name); // qty 2
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name); // qty 1

    expect(useBasketStore.getState().getItemCount()).toBe(3);
  });

  it("reflects quantity changes", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().updateQuantity(PRODUCT_A.productId, 5);

    expect(useBasketStore.getState().getItemCount()).toBe(5);
  });

  it("decrements after item removal", () => {
    useBasketStore.getState().addItem(PRODUCT_A.productId, PRODUCT_A.name);
    useBasketStore.getState().addItem(PRODUCT_B.productId, PRODUCT_B.name);
    useBasketStore.getState().removeItem(PRODUCT_A.productId);

    expect(useBasketStore.getState().getItemCount()).toBe(1);
  });
});
