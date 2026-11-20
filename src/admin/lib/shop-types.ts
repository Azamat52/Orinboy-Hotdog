// Promo dates: "YYYY-MM-DD" (old, whole day) or "YYYY-MM-DDTHH:mm" (Tashkent time).
const TZ = "+05:00";
const parsePromoDate = (value, end = false) => {
  if (!value || typeof value !== "string") return null;
  const stamp =
    value.length <= 10
      ? `${value}T${end ? "23:59:59" : "00:00:00"}${TZ}`
      : /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
        ? value
        : `${value}${value.length === 16 ? ":00" : ""}${TZ}`;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) ? ms : null;
};
const promoStartMs = (p) => parsePromoDate(p.startsAt);
const promoEndMs = (p) => parsePromoDate(p.endsAt, true);
const isPromoExpired = (p, now = Date.now()) => {
  const e = promoEndMs(p);
  return e !== null && e <= now;
};
const isPromoUpcoming = (p, now = Date.now()) => {
  const s = promoStartMs(p);
  return s !== null && s > now;
};
const STATUS_LABELS = {
  new: "Yangi",
  received: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  on_way: "Yo'lda",
  delivered: "Yetkazildi",
  ready_pickup: "Olib ketishga tayyor",
  picked_up: "Olib ketildi",
  cancelled: "Bekor qilindi",
};
const DELIVERY_STATUSES = ["new", "received", "preparing", "on_way", "delivered", "cancelled"];
const PICKUP_STATUSES = ["new", "received", "preparing", "ready_pickup", "picked_up", "cancelled"];
const statusesFor = (deliveryType) =>
  deliveryType === "pickup" ? PICKUP_STATUSES : DELIVERY_STATUSES;
const nextStatusesFor = (o) => {
  if (["cancelled", "delivered", "picked_up"].includes(o.status)) return [];
  if (o.status === "new") return ["received", "cancelled"];
  const flow = statusesFor(o.deliveryType).filter((s) => s !== "cancelled");
  return [...flow.slice(flow.indexOf(o.status) + 1), "cancelled"];
};
const normStatus = (o) =>
  String(o?.status ?? "")
    .trim()
    .toLowerCase();
const COMPLETED_STATUSES = ["delivered", "picked_up"];
const ACTIVE_STATUSES = ["new", "received", "preparing", "on_way", "ready_pickup"];
/** Faqat yetkazilgan yoki olib ketilgan buyurtma tushum hisoblanadi */
const isCompleted = (o) => COMPLETED_STATUSES.includes(normStatus(o));
const isActive = (o) => ACTIVE_STATUSES.includes(normStatus(o));
const isCancelled = (o) => normStatus(o) === "cancelled";
const orderSum = (list) => list.reduce((s, o) => s + (Number(o.total) || 0), 0);
/** Foiz o'zgarish: oldingi davr 0 bo'lsa null */
const pctChange = (cur, prev) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
const fmtSum = (n) => `${n.toLocaleString("ru-RU")} so'm`;
const fmtDate = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const CANCEL_REASONS = [
  "To'lov cheki tasdiqlanmadi",
  "To'lov summasi mos kelmadi",
  "Mahsulot tugab qolgan",
  "Manzil yetkazib berish hududidan tashqarida",
  "Mijoz bilan bog'lanib bo'lmadi",
  "Mijozning o'zi bekor qildi",
];
export {
  CANCEL_REASONS,
  DELIVERY_STATUSES,
  PICKUP_STATUSES,
  STATUS_LABELS,
  fmtDate,
  fmtSum,
  isPromoExpired,
  promoEndMs,
  promoStartMs,
  isPromoUpcoming,
  nextStatusesFor,
  statusesFor,
  isCompleted,
  isActive,
  isCancelled,
  orderSum,
  pctChange,
};
