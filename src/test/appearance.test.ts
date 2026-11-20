import test from "node:test";
import assert from "node:assert/strict";
import { appearanceKey, resolveTheme, applyTheme } from "../lib/appearance";
test("each account and guest have isolated preference keys", () => {
  assert.notEqual(appearanceKey("user-a"), appearanceKey("user-b"));
  assert.notEqual(appearanceKey("user-a"), appearanceKey(null));
});
test("system follows the device in both directions", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
test("explicit dark and light ignore device preference", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});
test("admin classes and storefront theme always switch together", () => {
  const classes = new Set();
  const root = {
    dataset: {},
    style: {},
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
  } as unknown as HTMLElement;
  applyTheme("dark", false, root);
  assert.equal(root.dataset.siteTheme, "dark");
  assert.equal(classes.has("dark"), true);
  assert.equal(classes.has("light"), false);
  applyTheme("light", true, root);
  assert.equal(root.dataset.siteTheme, "light");
  assert.equal(classes.has("dark"), false);
  assert.equal(classes.has("light"), true);
  assert.equal(root.style.colorScheme, "light");
});
