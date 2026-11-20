import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { customerStatusFeed } from "@/admin/lib/db.functions";
import { STATUS_LABELS } from "@/admin/lib/shop-types";
import { useCustomer } from "@/lib/customer";

const guestStorage = "xonqa-guest-notifications";
export function bookingGuestKey() {
  let key = localStorage.getItem(guestStorage);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(guestStorage, key);
  }
  return key;
}
const bookingLabels = {
  new: "Bron so‘rovi yuborildi",
  confirmed: "Bron tasdiqlandi",
  cancelled: "Bron bekor qilindi",
  done: "Bron yakunlandi",
};

export default function CustomerNotifications() {
  const user = useCustomer();
  const admin = useLocation().pathname.startsWith("/admin");
  useEffect(() => {
    if (admin || user === undefined) return;
    let active = true;
    let busy = false;
    async function refresh() {
      const guestKey = localStorage.getItem(guestStorage);
      if (busy || document.hidden || (!user && !guestKey)) return;
      const cursor = "xonqa-status-cursor:" + (user?.id || guestKey);
      busy = true;
      try {
        let more = true;
        while (more && active) {
          const rows = await customerStatusFeed({
            data: { guestKey, after: localStorage.getItem(cursor) || 0 },
          });
          if (!active) return;
          for (const row of rows) {
            const booking = row.kind === "reservations";
            const title = booking
              ? [bookingLabels[row.status] || "Bron holati yangilandi", row.tableName].filter(Boolean).join(" — ")
              : `Buyurtma #${row.reference} · ${STATUS_LABELS[row.status] || row.status}`;
            toast(title, {
              id: "status-" + row.id,
              description: row.reason || undefined,
            });
            localStorage.setItem(cursor, String(row.id));
          }
          more = rows.length === 100;
        }
      } catch {
        // Retry from the last delivered event on reconnect or the next poll.
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("xonqa-db", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("xonqa-db", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.id, user === undefined, admin]);
  return null;
}
