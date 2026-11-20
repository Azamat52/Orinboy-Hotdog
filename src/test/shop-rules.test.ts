import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  paginate,
  pageNumbers,
  updateCartQuantity,
  normalizeRows,
  PRODUCTS_PER_PAGE,
  PROMOTIONS_PER_PAGE,
} from "../lib/shop-rules";
import { promoStartMs, promoEndMs } from "../admin/lib/shop-types";

test("product pages contain 9 items", () => {
  const page = paginate(
    Array.from({ length: 20 }, (_, i) => i),
    2,
    PRODUCTS_PER_PAGE,
  );
  assert.deepEqual(page.items, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.equal(page.pageCount, 3);
});
test("promotion pages contain 4 items", () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5, 6, 7], 2, PROMOTIONS_PER_PAGE).items, [5, 6, 7]);
});
test("nearby page window is current minus 3 through plus 3", () =>
  assert.deepEqual(pageNumbers(5, 12), [2, 3, 4, 5, 6, 7, 8]));
test("page window excludes nonexistent pages", () => {
  assert.deepEqual(pageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(pageNumbers(12, 12), [9, 10, 11, 12]);
});
test("empty list has zero pages and no page numbers", () => {
  assert.equal(paginate([], 1, 9).pageCount, 0);
  assert.deepEqual(pageNumbers(1, 0), []);
});
test("page is clamped after list shrinks", () =>
  assert.equal(paginate([1, 2], 10, 3).currentPage, 1));
test("cart quantities exceed the former 10-item cap", () =>
  assert.deepEqual(updateCartQuantity([{ id: "p", qty: 10 }], "p", 25), [{ id: "p", qty: 35 }]));
test("zero quantity removes product so its initial control returns", () =>
  assert.deepEqual(updateCartQuantity([{ id: "p", qty: 1 }], "p", -1), []));
test("promotion mapping accepts API data rows and preserves row ID", () =>
  assert.deepEqual(
    normalizeRows([{ id: "promo1", data: { title: { uz: "Set" }, active: true } }]),
    [{ id: "promo1", title: { uz: "Set" }, active: true }],
  ));
test("explicit UTC promotion timestamps retain their original instant", () =>
  assert.equal(
    promoStartMs({ startsAt: "2026-10-17T17:00:00Z" }),
    Date.parse("2026-10-17T17:00:00Z"),
  ));
test("datetime-local promotions remain in Tashkent time", () =>
  assert.equal(promoStartMs({ startsAt: "2026-10-17T22:00" }), Date.parse("2026-10-17T17:00:00Z")));
test("date-only expiry covers entire Tashkent day", () =>
  assert.equal(promoEndMs({ endsAt: "2026-10-17" }), Date.parse("2026-10-17T18:59:59Z")));

function apiWith(mock: any): any {
  const source = readFileSync(
    new URL("../../supabase/functions/api/handlers.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "exports", "module", "Deno", "crypto", js)(
    () => ({ createClient: () => mock }),
    module.exports,
    module,
    { env: { get: () => "test-only" } },
    globalThis.crypto,
  );
  return module.exports;
}
test("public API maps newly saved promotion rows and excludes inactive ones", async () => {
  const api = apiWith({
    from: () => ({
      select: async () => ({
        data: [
          { id: "new", data: { title: { uz: "New" }, active: true } },
          { id: "off", data: { active: false } },
        ],
        error: null,
      }),
    }),
  });
  assert.deepEqual(await api.getPublicPromotions(), [
    { id: "new", title: { uz: "New" }, active: true },
  ]);
});
test("promotion query errors are reported, not silently returned as empty", async () => {
  const api = apiWith({
    from: () => ({ select: async () => ({ data: null, error: { message: "query failed" } }) }),
  });
  await assert.rejects(api.getPublicPromotions(), /query failed/);
});
test("order API preserves quantity above 10 and all 51 lines", async () => {
  let saved;
  const api = apiWith({
    from: (table) => {
      if (table === "app_settings")
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { value: { enabled: false, open: "10:00", close: "23:00" } },
              }),
            }),
          }),
        };
      if (table === "products")
        return {
          select: () => ({
            in: async () => ({ data: [{ id: "p", data: { name: "Taom", price: 1000 } }] }),
          }),
        };
      return {
        insert: (row) => {
          saved = row.data;
          return { select: () => ({ single: async () => ({ data: { id: "1" }, error: null }) }) };
        },
        update: () => ({ eq: async () => ({}) }),
      };
    },
  });
  await api.placeOrder({
    data: {
      name: "Test",
      phone: "test",
      items: Array.from({ length: 51 }, () => ({ productId: "p", quantity: 25 })),
    },
  });
  assert.equal(saved.items.length, 51);
  assert.equal(saved.items[0].quantity, 25);
  assert.equal(saved.total, 1275000);
});

test("order API rejects closed-hours requests before writing an order", async () => {
  let writes = 0;
  const current = new Date(Date.now() + 5 * 3600e3);
  const minute = current.getUTCHours() * 60 + current.getUTCMinutes();
  const fmt = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const hours = {
    enabled: true,
    open: fmt((minute + 10) % 1440),
    close: fmt((minute + 20) % 1440),
  };
  const api = apiWith({
    from: (table) => {
      if (table === "app_settings")
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: hours } }) }) }),
        };
      writes++;
      throw new Error("unexpected write");
    },
  });
  await assert.rejects(
    api.placeOrder({
      data: { name: "Test", phone: "test", items: [{ productId: "p", quantity: 1 }] },
    }),
    new RegExp(`Ish vaqtimiz: ${hours.open}–${hours.close}`),
  );
  assert.equal(writes, 0);
});
