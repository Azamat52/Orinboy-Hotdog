import CatalogImage from "@/components/site/CatalogImage";
import { Minus, Plus, ShoppingBasket, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import SiteLoader from "@/components/site/SiteLoader";
import { useSiteSettings } from "@/components/site/site-settings";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCustomer } from "@/lib/customer";
import { requireCustomerLogin } from "@/lib/customer-login";
import { money } from "../data/site";
import { DetailShell, addItemsToCart, useSiteData, useToast, promoView } from "./site-extras";

export default function ProductDetail() {
  const { id } = useParams();
  const user = useCustomer();
  const navigate = useNavigate();
  const { allowShopping } = useSiteSettings();
  const { products, promos, loaded } = useSiteData();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useToast();
  const p = products.find((x) => x.id === id);

  useEffect(() => {
    if (p) document.title = `${p.name} — Xonqa O'rinboy Hotdog`;
  }, [p]);

  if (!loaded)
    return (
      <DetailShell>
        <div className="wrap detail-loading">
          <SiteLoader />
        </div>
      </DetailShell>
    );
  if (!p)
    return (
      <DetailShell>
        <div className="wrap detail-empty">
          <h1 className="section-title">Taom topilmadi</h1>
          <Link className="button" to="/#menyu">
            Menyuga qaytish
          </Link>
        </div>
      </DetailShell>
    );

  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const inPromos = promos.filter((pr) => (pr.items ?? []).some((it) => it.productId === p.id));

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
    setAdding(true);
    try {
      const ok = await addItemsToCart([{ id: p.id, qty }]);
      setToast(
        ok ? `${qty} ta savatga qo‘shildi` : "Savat uchun avval profilingizga kiring (Kirish).",
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
          <CatalogImage src={p.image} alt={p.name} />
          {p.tag && <span className="product-tag">{p.tag}</span>}
        </div>
        <div className="detail-info">
          <Link to="/#menyu" className="text-link detail-back back-btn">
            <ArrowLeft size={17} aria-hidden="true" /> Menyu
          </Link>
          <div className="eyebrow">{p.weight}</div>
          <h1 className="section-title">{p.name}</h1>
          <p className="detail-desc">{p.desc}</p>
          <div className="detail-price">{money(p.price)}</div>
          <div className="detail-purchase" aria-label="Buyurtma miqdori va savatga qo‘shish">
            <div className="detail-quantity-heading">
              <span>Miqdor</span>
              <span>
                Jami: <strong>{money(p.price * qty)}</strong>
              </span>
            </div>
            <div className="detail-buy detail-buy-modern">
              <div className="qty" role="group" aria-label="Mahsulot miqdori">
                <button
                  type="button"
                  disabled={adding || qty <= 1}
                  aria-label="Kamaytirish"
                  onClick={() => {
                    if (allowShopping()) setQty((q) => Math.max(1, q - 1));
                  }}
                >
                  <Minus size={19} aria-hidden="true" />
                </button>
                <output aria-live="polite">{qty}</output>
                <button
                  type="button"
                  disabled={adding}
                  aria-label="Oshirish"
                  onClick={() => {
                    if (allowShopping()) setQty((q) => Math.min(99, q + 1));
                  }}
                >
                  <Plus size={19} aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                className="button detail-add-button"
                onClick={add}
                disabled={adding}
              >
                {adding ? (
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                ) : (
                  <ShoppingBasket size={19} aria-hidden="true" />
                )}
                <span>{adding ? "Qo‘shilmoqda…" : "Savatga qo‘shish"}</span>
              </button>
            </div>
          </div>
          <Link to="/?cart=open#menyu" className="detail-open-cart">
            <ShoppingBasket size={17} aria-hidden="true" /> Savatni ochish{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {inPromos.length > 0 && (
            <div className="detail-promos">
              <div className="eyebrow">Bu taom aksiyada</div>
              {inPromos.map((pr) => {
                const v = promoView(pr, products);
                return (
                  <Link key={pr.id} to={`/aksiya/${pr.id}`} className="detail-promo-link">
                    <b>{v.badge}</b> {v.title}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {!related.length && (
        <p role="status" className="wrap no-results">
          Bu turkumda boshqa taomlar hozircha yo‘q.
        </p>
      )}
      {related.length > 0 && (
        <section className="wrap detail-related">
          <div className="eyebrow">Shu turkumdan</div>
          <h2 className="section-title">Yana tatib ko‘ring</h2>
          <div className="product-grid">
            {related.map((r, i) => (
              <Link
                key={r.id}
                to={`/mahsulot/${r.id}`}
                className="product"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="product-image">
                  <img src={r.image} alt={r.name} loading="lazy" />
                  <span className="product-image-hint" aria-hidden="true">
                    Batafsil ko‘rish
                  </span>
                </div>
                <div className="product-body">
                  <div className="product-top">
                    <h3>{r.name}</h3>
                    <span className="product-price">{money(r.price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </DetailShell>
  );
}
