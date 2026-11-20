// Older web orders stored payment and comment inside the delivery address.
// Read those rows without changing saved history or requiring a server update.
export function orderDetails(order) {
  const raw = String(order.address || order.delivery || "");
  const paymentMatch = raw.match(/To[‘’'ʻʼ`]?lov\s*:\s*([^\n]+)/i);
  const noteMatch = raw.match(/Izoh\s*:\s*([\s\S]*)/i);
  const address = raw
    .split(/\s*(?:To[‘’'ʻʼ`]?lov|Izoh)\s*:/i)[0]
    .replace(/^Yetkazib berish\s*:\s*/i, "")
    .trim();
  const paymentText = String(
    paymentMatch?.[1] || order.paymentMethod || order.payment || "",
  ).trim();
  const paymentMethod = /karta|card/i.test(paymentText)
    ? "card"
    : /naqd|cash/i.test(paymentText)
      ? "cash"
      : paymentText;
  const location = order.location;
  const name = location?.name || address;
  const lat = location?.lat ?? location?.latitude;
  const lng = location?.lng ?? location?.longitude;
  const coordinates =
    lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? `${lat},${lng}`
      : null;
  const query = coordinates || name;
  const suppliedUrl = location?.mapUrl;
  const mapUrl =
    typeof suppliedUrl === "string" && /^https?:\/\//i.test(suppliedUrl)
      ? suppliedUrl
      : query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : "";
  return {
    name,
    mapUrl,
    paymentMethod,
    phone: order.phone || order.phoneNumber || "",
    note: order.note || order.comment || noteMatch?.[1]?.trim() || "",
    pickup: order.deliveryType === "pickup" || /^O[‘’'ʻʼ`]?zim olib ketaman/i.test(address),
  };
}
