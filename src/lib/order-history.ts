// Mijoz buyurtmalari tarixi (brauzerda saqlanadi) va admin xabarlari uchun ovozli toast.
import { toast } from "sonner";
const KEY = "orderHistory";
export const STATUS_MESSAGES = {
  received: "Buyurtmangiz qabul qilindi! Sizni ko‘p kuttirmaymiz  Endi uni bekor qilib bo‘lmaydi.",
  preparing: "Oshpazimiz ishga kirishdi — buyurtmangiz tayyorlanmoqda ",
  on_way: "Buyurtmangiz yo‘lda! Kuryerimiz tez orada yetib boradi ",
  ready_pickup: "Buyurtmangiz tayyor — olib ketishingiz mumkin ",
  delivered: "Buyurtmangiz yetkazildi. Yoqimli ishtaha! ❤",
  picked_up: "Buyurtmangizni olib ketdingiz. Yoqimli ishtaha! ❤",
  cancelled: "Buyurtmangiz bekor qilindi.",
};
export const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export const saveHistory = (list) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("xonqa-history"));
};
export const addToHistory = (o) => saveHistory([o, ...loadHistory().filter((x) => x.id !== o.id)]);
export const patchHistory = (id, patch) =>
  saveHistory(loadHistory().map((x) => (x.id === id ? { ...x, ...patch } : x)));
export function playNotify() {
  try {
    const C =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    const t = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.15 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.15);
      o.stop(t + i * 0.15 + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* Optional browser feature or stored preference. */
  }
}
/** Faqat admin tomonidan kelgan status o‘zgarishlari uchun (ovoz bilan). */
const seen = new Set();
export function adminNotify(id, status, reason) {
  const k = `${id}:${status}`;
  if (seen.has(k)) return;
  seen.add(k);
  playNotify();
  const msg = STATUS_MESSAGES[status] || `Holat: ${status}`;
  const text = `Buyurtma #${id}: ${msg}${status === "cancelled" && reason ? ` Sabab: ${reason}` : ""}`;
  if (status === "cancelled")
    toast.error(text, {
      duration: 8000,
      className: "xonqa-order-status xonqa-order-status-error",
      description: "Buyurtma holati yangilandi",
    });
  else
    toast.success(text, {
      duration: 7000,
      className: "xonqa-order-status xonqa-order-status-success",
      description: "Buyurtma holati yangilandi",
    });
}
