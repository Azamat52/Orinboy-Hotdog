import test from "node:test";
import assert from "node:assert/strict";
import { workHoursStatus, workHoursLabel, shoppingNotice } from "../admin/lib/work-hours";
const hours = { enabled: true, open: "09:00", close: "23:00" };
const at = (time) => Date.parse(`2026-10-18T${time}:00+05:00`);
test("opening boundary permits shopping in Tashkent time", () =>
  assert.equal(shoppingNotice(hours, at("09:00")), null));
test("closing boundary blocks shopping and reports admin hours", () =>
  assert.equal(
    shoppingNotice(hours, at("23:00")),
    "Hozir sayt yopiq. Ish vaqtimiz: 09:00–23:00 (Toshkent vaqti).",
  ));
test("before opening is closed", () =>
  assert.equal(workHoursStatus(hours, at("08:59")).open, false));
test("overnight hours allow shopping after midnight", () =>
  assert.equal(shoppingNotice({ ...hours, open: "22:00", close: "06:00" }, at("02:00")), null));
test("overnight hours end exactly at closing", () =>
  assert.equal(
    workHoursStatus({ ...hours, open: "22:00", close: "06:00" }, at("06:00")).open,
    false,
  ));
test("disabled hours allow shopping around the clock", () =>
  assert.equal(shoppingNotice({ ...hours, enabled: false }, at("03:00")), null));
test("equal endpoints mean 24 hours", () =>
  assert.equal(workHoursStatus({ ...hours, close: "09:00" }, at("03:00")).open, true));
test("footer reflects saved hours", () =>
  assert.equal(workHoursLabel({ ...hours, open: "11:30", close: "20:45" }), "11:30–20:45"));
test("missing schedule does not authorize shopping", () =>
  assert.notEqual(shoppingNotice(null), null));
