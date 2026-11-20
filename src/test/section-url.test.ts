import assert from "node:assert/strict";
import test from "node:test";
import { sectionUrl } from "../lib/section-url";

test("scrolling to contact clears unrelated list page but keeps search", () => {
  assert.equal(
    sectionUrl("https://x.test/?page=2&promoPage=3&q=cola#menyu", "aloqa"),
    "/?q=cola#aloqa",
  );
});
test("menu pagination is valid and hash comes last", () => {
  assert.equal(sectionUrl("https://x.test/?page=2#menyu", "menyu"), "/?page=2#menyu");
});
test("promotions retains its own page only", () => {
  assert.equal(
    sectionUrl("https://x.test/?page=2&promoPage=3#menyu", "aksiyalar"),
    "/?promoPage=3#aksiyalar",
  );
});
