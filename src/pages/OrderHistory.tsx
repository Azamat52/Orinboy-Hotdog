import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DetailShell } from "./site-extras";
import { money } from "../data/site";
import { getMyOrderStatusFn } from "@/admin/lib/db.functions";
import { STATUS_LABELS } from "@/admin/lib/shop-types";
import { loadHistory, patchHistory } from "@/lib/order-history";
import "../styles/site.css";

const FINAL = ["cancelled", "delivered", "picked_up"];

export default function OrderHistory() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    document.title = "Buyurtmalar tarixi — Xonqa O'rinboy Hotdog";
    const sync = () => setList(loadHistory());
    sync();
    const refresh = () =>
      loadHistory()
        .filter((o) => !FINAL.includes(o.status))
        .forEach((o) =>
          getMyOrderStatusFn({ data: { id: o.id, phone: o.phone } })
            .then((r) => {
              if (
                r?.status &&
                (r.status !== o.status || (r.cancelReason || "") !== (o.cancelReason || ""))
              )
                patchHistory(o.id, { status: r.status, cancelReason: r.cancelReason || "" });
            })
            .catch(() => {}),
        );
    refresh();
    window.addEventListener("xonqa-db", refresh);
    const t = setInterval(refresh, 20000);
    window.addEventListener("xonqa-history", sync);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("xonqa-db", refresh);
      window.removeEventListener("xonqa-history", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const shown = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("uz");
    if (!s) return list;
    return list.filter((o) =>
      `#${o.id} ${o.id} ${STATUS_LABELS[o.status] || o.status} ${o.address || ""} ${o.cancelReason || ""} ${(o.items || []).map((i) => i.name).join(" ")}`
        .toLocaleLowerCase("uz")
        .includes(s),
    );
  }, [list, q]);

  return (
    <DetailShell>
      <section className="wrap" style={{ paddingBlock: "40px" }}>
        <Link to="/" className="history-home back-btn">
          <ArrowLeft size={17} aria-hidden="true" /> Bosh sahifaga qaytish
        </Link>
        <div className="eyebrow">Mening buyurtmalarim</div>
        <h1 className="section-title">Buyurtmalar tarixi</h1>
        <div className="history-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Raqam, taom, holat yoki manzil bo‘yicha qidirish"
            aria-label="Buyurtmalarni qidirish"
          />
        </div>
        {!list.length ? (
          <p className="story-copy">Hali buyurtma bermagansiz.</p>
        ) : !shown.length ? (
          <p className="story-copy">Hech narsa topilmadi.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {shown.map((o) => (
              <article
                key={o.id}
                className="checkout"
                style={{
                  border: "1px solid currentColor",
                  borderColor: "rgba(127,127,127,.3)",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>Buyurtma #{o.id}</strong>
                  <span
                    className={o.status === "cancelled" ? "status-cancelled" : ""}
                    style={{
                      fontWeight: 700,
                      color: o.status === "cancelled" ? "#e5484d" : undefined,
                    }}
                  >
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                <small style={{ opacity: 0.7 }}>
                  {o.createdAt ? new Date(o.createdAt).toLocaleString("uz-UZ") : ""} ·{" "}
                  {o.method === "pickup" ? "Olib ketish" : "Yetkazib berish"} ·{" "}
                  {o.payment === "card" ? "Karta" : "Naqd"}
                </small>
                <ul style={{ margin: "12px 0", paddingLeft: 18 }}>
                  {(o.items || []).map((i, k) => (
                    <li key={k}>
                      {i.name} × {i.qty} — {money(i.price * i.qty)}
                    </li>
                  ))}
                </ul>
                {o.address ? (
                  <p>
                    <b>Manzil:</b> {o.address}
                  </p>
                ) : null}
                {o.comment ? (
                  <p>
                    <b>Izoh:</b> {o.comment}
                  </p>
                ) : null}
                {o.status === "cancelled" && o.cancelReason ? (
                  <p style={{ color: "#e5484d" }}>
                    <b>Bekor qilish sababi:</b> {o.cancelReason}
                  </p>
                ) : null}
                <p>
                  <b>Jami:</b> {money(o.total || 0)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </DetailShell>
  );
}
