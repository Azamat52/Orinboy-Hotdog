import test from "node:test";
import assert from "node:assert/strict";
import { orderDetails } from "../lib/order-details";

test("legacy web card order overrides the old cash default and separates address", () => {
  const d = orderDetails({
    address: "Yetkazib berish: Xonqa, Xorazm\nTo‘lov: Karta\nIzoh: Qo‘ng‘iroq qiling",
    paymentMethod: "cash",
    phone: "+998883615755",
  });
  assert.equal(d.paymentMethod, "card");
  assert.equal(d.name, "Xonqa, Xorazm");
  assert.equal(d.note, "Qo‘ng‘iroq qiling");
  assert.equal(d.phone, "+998883615755");
  assert.equal(d.mapUrl, "https://www.google.com/maps/search/?api=1&query=Xonqa%2C%20Xorazm");
});
test("structured location opens coordinates while displaying the address name", () => {
  const d = orderDetails({
    location: { name: "GUNAYDIN, 3 POXTA", lat: 41.47275, lng: 60.77425 },
    paymentMethod: "cash",
  });
  assert.equal(d.name, "GUNAYDIN, 3 POXTA");
  assert.equal(d.mapUrl, "https://www.google.com/maps/search/?api=1&query=41.47275%2C60.77425");
  assert.equal(d.paymentMethod, "cash");
});
test("pickup order is not shown as a delivery address", () => {
  assert.equal(orderDetails({ address: "O‘zim olib ketaman\nTo‘lov: Naqd" }).pickup, true);
});
