import test from "node:test";
import assert from "node:assert/strict";
import { resolveCartItems, updateCartQuantity } from "../lib/shop-rules";

test("promotion cart can arrive before the menu without losing saved quantities", () => {
  const cart = updateCartQuantity([], "chicken", 2);
  assert.deepEqual(resolveCartItems(cart, []), []);
  const product = { id: "chicken", image: "chicken.jpg", price: 35000 };
  assert.deepEqual(resolveCartItems(cart, [product]), [{ id: "chicken", qty: 2, product }]);
  assert.deepEqual(cart, [{ id: "chicken", qty: 2 }]);
});
test("deleted product cannot crash cart rendering or enter checkout totals", () => {
  const product = { id: "available", price: 12000 };
  const items = resolveCartItems(
    [
      { id: "deleted", qty: 1 },
      { id: "available", qty: 3 },
    ],
    [product],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].product.id, "available");
  assert.equal(
    items.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    36000,
  );
});
test("invalid cart rows cannot break product access", () => {
  assert.deepEqual(
    resolveCartItems([null, { id: "p", qty: 0 }, { id: "p", qty: -1 }], [null, { id: "p" }]),
    [],
  );
});
