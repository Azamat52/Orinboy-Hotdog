import CatalogImage from "@/components/site/CatalogImage";
import { ArrowLeft, ArrowRight, ShoppingBasket, Loader2, Timer } from "lucide-react";
import SiteLoader from "@/components/site/SiteLoader";
import { useSiteSettings } from "@/components/site/site-settings";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCustomer } from "@/lib/customer";
import { requireCustomerLogin } from "@/lib/customer-login";
import { money } from "../data/site";
import { isCartSetPromo } from "@/admin/lib/promo-types";
import {
  DetailShell,
  addItemsToCart,
  promoCartId,
  useSiteData,
  useToast,
  useCountdown,
  promoView,
} from "./site-extras";

export default function PromotionDetail() {
  const { id } = useParams();
  const user = useCustomer();
  const navigate = useNavigate();
  const { allowShopping } = useSiteSettings();
  const { products, promos, loaded } = useSiteData();
  const [toast, setToast] = useToast();
  const [adding, setAdding] = useState(false);
  const promo = promos.find((x) => x.id === id);
  const left = useCountdown(promo);
  const v = promo ? promoView(promo, products) : null;

  useEffect(() => {
    if (v) document.title = `${v.title} — Aksiya | Xonqa`;
  }, [v?.title]);

  if (!loaded)
    return (
      <DetailShell>
        <div className="wrap detail-loading">
          <SiteLoader />
        </div>
      </DetailShell>
    );
  if (!promo)
    return (
      <DetailShell>
        <div className="wrap detail-empty">
          <h1 className="section-title">Aksiya topilmadi yoki tugagan</h1>
          <Link className="button" to="/">
            Bosh sahifa
          </Link>
        </div>
      </DetailShell>
    );

  // Only menu products can go into the site cart.
  const cartable = v.items.filter((x) => products.some((p) => p.id === x.product.id));
  const add = async () => {
    if (adding) return;
    if (!user) {
      if (user === null)
        requireCustomerLogin(
          navigate,
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      else setToast("Profil tekshirilmoqda, biroz kuting.");
      return;
    }
    if (!allowShopping()) return;
    const asSet = isCartSetPromo(promo) && v.items.length > 0;
    if (!asSet && !cartable.length)
      return setToast("Bu aksiya mahsulotlarini telefon orqali buyurtma qiling.");
    setAdding(true);
    try {
      const ok = await addItemsToCart(
        asSet
          ? [{ id: promoCartId(promo.id), qty: 1 }]
          : cartable.map((x) => ({ id: x.product.id, qty: x.qty })),
      );
      setToast(
        ok
          ? "Aksiya taomlari savatga qo‘shildi"
          : "Savat uchun avval profilingizga kiring (Kirish).",
      );
    } catch {
      setToast("Xatolik, qayta urinib ko‘ring.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <DetailShell toast={toast}>
      <section className="wrap detail-grid">
        <div className="detail-media">
          <CatalogImage src={v.image} alt={v.title} />
          {v.badge && <span className="promo-badge big">{v.badge}</span>}
        </div>
        <div className="detail-info">
          <Link to="/#aksiyalar" className="text-link detail-back back-btn">
            <ArrowLeft size={17} aria-hidden="true" /> Aksiyalar
          </Link>
          <div className="eyebrow">Aksiya</div>
          <h1 className="section-title">{v.title}</h1>
          <p className="detail-rule">{v.rule}</p>
          {v.desc && <p className="detail-desc">{v.desc}</p>}
          {left && (
            <div className="promo-left big">
              <Timer size={16} aria-hidden="true" /> Tugashiga: {left}
            </div>
          )}
          {v.saved > 0 && (
            <div className="detail-price">
              <s>{money(v.full)}</s> {money(v.final)} <small>Tejaysiz: {money(v.saved)}</small>
            </div>
          )}
          <div className="detail-buy">
            <button type="button" className="button" onClick={add} disabled={adding}>
              {adding ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShoppingBasket size={19} />
              )}{" "}
              {adding ? "Qo‘shilmoqda…" : "Aksiyani savatga qo‘shish"}
            </button>
          </div>
          <Link to="/?cart=open#aksiyalar" className="detail-open-cart">
            <ShoppingBasket size={17} aria-hidden="true" /> Savatni ochish{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
      {!v.items.length && (
        <p role="status" className="wrap no-results">
          Aksiya tarkibiga hali mahsulot qo‘shilmagan.
        </p>
      )}
      {v.items.length > 0 && (
        <section className="wrap detail-related">
          <div className="eyebrow">Aksiya tarkibi</div>
          <h2 className="section-title">Ichida nimalar bor</h2>
          <div className="product-grid">
            {v.items.map(({ product: p, qty }, i) => {
              const inMenu = products.some((x) => x.id === p.id);
              const card = (
                <>
                  <div className="product-image">
                    <CatalogImage src={p.image} alt={p.name} loading="lazy" />
                    <span className="product-tag">× {qty}</span>
                  </div>
                  <div className="product-body">
                    <div className="product-top">
                      <h3>{typeof p.name === "object" ? p.name.uz : p.name}</h3>
                      <span className="product-price">{money(p.price)}</span>
                    </div>
                  </div>
                </>
              );
              return inMenu ? (
                <Link
                  key={p.id}
                  to={`/mahsulot/${p.id}`}
                  className="product"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  {card}
                </Link>
              ) : (
                <div key={p.id} className="product" style={{ animationDelay: `${i * 45}ms` }}>
                  {card}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </DetailShell>
  );
}
