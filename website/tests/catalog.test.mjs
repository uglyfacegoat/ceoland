import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCart,
  cartCount,
  cartSubtotal,
  updateCartLine,
} from "../src/cart-model.ts";
import { product } from "../src/catalog.ts";

test("old saved carts migrate to the white SKU; empty carts remain empty", () => {
  assert.deepEqual(parseCart(null), []);
  assert.deepEqual(parseCart('{"version":1,"quantity":3}'), [
    { variantId: "ceowallet-white", quantity: 3 },
  ]);
  assert.deepEqual(parseCart('{"version":1,"quantity":0}'), []);
});
test("each color keeps its quantity and totals use integer kopecks", () => {
  const white = updateCartLine([], "ceowallet-white", 2);
  const both = updateCartLine(white, "ceowallet-black", 1);
  assert.equal(product.priceMinor, 299000);
  assert.equal(cartCount(both), 3);
  assert.equal(cartSubtotal(both), 897000);
  assert.deepEqual(
    parseCart(JSON.stringify({ version: 2, items: both })),
    both,
  );
  assert.deepEqual(updateCartLine(both, "ceowallet-black", 0), white);
  assert.equal(cartCount(white), 2);
});
test("invalid storage, unknown SKUs, duplicates and excessive quantities are rejected", () => {
  for (const serialized of [
    "null",
    "{}",
    "broken",
    '{"version":3,"items":[]}',
    ...[-1, 0.5, 100, "2"].map((quantity) =>
      JSON.stringify({ version: 1, quantity }),
    ),
    ...[
      [{ variantId: "unavailable", quantity: 1 }],
      [{ variantId: "ceowallet-white", quantity: 0 }],
      [
        { variantId: "ceowallet-white", quantity: 1 },
        { variantId: "ceowallet-white", quantity: 1 },
      ],
      [
        { variantId: "ceowallet-white", quantity: 99 },
        { variantId: "ceowallet-black", quantity: 1 },
      ],
    ].map((items) => JSON.stringify({ version: 2, items })),
  ])
    assert.throws(() => parseCart(serialized));
  for (const quantity of [-1, 0.5, 100, NaN, Infinity])
    assert.throws(() => updateCartLine([], "ceowallet-white", quantity));
  assert.throws(() =>
    updateCartLine(
      [{ variantId: "ceowallet-white", quantity: 99 }],
      "ceowallet-black",
      1,
    ),
  );
});
