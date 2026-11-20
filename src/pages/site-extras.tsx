import CatalogImage from "@/components/site/CatalogImage";
import {
  LayoutDashboard,
  LogIn,
  UserRound,
  ShoppingBasket,
  Menu,
  X,
  ArrowLeft,
  ArrowUpRight,
  Timer,
} from "lucide-react";
import { useCustomer } from "@/lib/customer";
import SiteLoader from "@/components/site/SiteLoader";
import { supabase } from "@/integrations/supabase/client";
import { loadCart, saveCart } from "@/lib/customer";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast as sonnerToast } from "sonner";
import { loadMenu } from "@/admin/lib/admin.functions";
import { money } from "../data/site";
import {
  autoBadge,
  promoRule,
  promoSummary,
  msLeft,
  fmtLeft,
  promoTypeOf,
  birthdayInWindow,
  isCartSetPromo,
} from "@/admin/lib/promo-types";
import { isPromoExpired, isPromoUpcoming } from "@/admin/lib/shop-types";
import "../styles/site.css";
import Pagination from "@/components/site/Pagination";
import { PROMOTIONS_PER_PAGE, paginate, updateCartQuantity, normalizeRows } from "@/lib/shop-rules";

export const txt = (v) => (v && typeof v === "object" ? (v.uz ?? v.ru ?? v.en ?? "") : (v ?? ""));
const normProduct = (p) => ({
  ...p,
  name: txt(p.name),
  desc: txt(p.description ?? p.desc),
  weight: p.weight ?? "",
  tag: txt(p.tag),
});
// promoRule uses g.name.uz — keep a {uz} shape for it.
const ruleProducts = (list) => list.map((p) => ({ ...p, name: { uz: txt(p.name) } }));

/** Only promotions that are active right now. */
export const livePromos = (list = []) =>
  normalizeRows(list).filter((p) => {
    if (!p || p.active === false) return false;
    try {
      return !isPromoExpired(p) && !isPromoUpcoming(p);
    } catch {
      return true;
    }
  });

export async function loadSite() {
  const m = await loadMenu();
  let promos = livePromos(m.promotions ?? []);
  if (promos.some((p) => promoTypeOf(p) === "birthday")) {
    let birthday = "";
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user)
        birthday =
          (
            await supabase
              .from("profiles")
              .select("birthday")
              .eq("user_id", data.user.id)
              .maybeSingle()
          ).data?.birthday || "";
    } catch {
      /* treat as no birthday */
    }
    promos = promos.filter((p) => promoTypeOf(p) !== "birthday" || birthdayInWindow(p, birthday));
  }
  return { products: normalizeRows(m.products).map(normProduct), promos };
}

export const promoCartId = (promoId) => `promo:${promoId}`;

/** Promotions as cart "products": one set priced at the discounted total. */
export function promoCartProducts(promos = [], products = []) {
  return promos.filter(isCartSetPromo).flatMap((promo) => {
    try {
      const v = promoView(promo, products);
      if (!v.items.length) return [];
      return [
        {
          id: promoCartId(promo.id),
          promoId: promo.id,
          name: ` ${v.title}`,
          image: v.image,
          price: v.final,
          full: v.full,
          weight: v.items.map((x) => `${txt(x.product.name)} × ${x.qty}`).join(", "),
        },
      ];
    } catch {
      return [];
    }
  });
}
export const loadPromos = async () => (await loadSite()).promos;

/** Add positive quantities to the signed-in user's stored cart. Returns false when signed out. */
export async function addItemsToCart(items) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  let cart = await loadCart(data.user.id);
  for (const { id, qty } of items) {
    if (Number.isSafeInteger(qty) && qty > 0) cart = updateCartQuantity(cart, id, qty);
  }
  await saveCart(data.user.id, cart);
  window.dispatchEvent(new Event("xonqa-cart"));
  return true;
}

export function useSiteData() {
  const [state, setState] = useState({ products: [], promos: [], loaded: false });
  useEffect(() => {
    let revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const data = await loadSite();
        if (request === revision) setState({ ...data, loaded: true });
      } catch {
        if (request === revision) setState((previous) => ({ ...previous, loaded: true }));
      }
    };
    void refresh();
    window.addEventListener("xonqa-db", refresh);
    return () => {
      ++revision;
      window.removeEventListener("xonqa-db", refresh);
    };
  }, []);
  return state;
}

export function useCountdown(promo) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const ms = promo ? msLeft(promo, now) : null;
  return ms === null ? null : fmtLeft(ms);
}

export function promoView(promo, products) {
  const sum = promoSummary(promo, products);
  return {
    title: txt(promo.title) || "Aksiya",
    desc: txt(promo.description),
    badge: txt(promo.badge) || autoBadge(promo),
    rule: promoRule(promo, ruleProducts(products)),
    image: promo.image || sum.items[0]?.product.image || "",
    ...sum,
  };
}

function safeView(promo, products) {
  try {
    return promoView(promo, products);
  } catch (e) {
    console.error("Aksiya ko'rinishida xato:", e);
    return {
      title: txt(promo?.title) || "Aksiya",
      rule: "",
      badge: "",
      image: promo?.image || "",
      items: [],
      full: 0,
      final: 0,
      saved: 0,
    };
  }
}

function PromoCard({ promo, products, i }) {
  const v = safeView(promo, products);
  const left = useCountdown(promo);
  return (
    <Link
      to={`/aksiya/${promo.id}`}
      className="promo-card"
      style={{ animationDelay: `${i * 70}ms` }}
    >
      <div className="promo-card-img">
        <CatalogImage src={v.image} alt={v.title} loading="lazy" />
        {v.badge && <span className="promo-badge">{v.badge}</span>}
      </div>
      <div className="promo-card-body">
        <h3>{v.title}</h3>
        <p>{v.rule}</p>
        <div className="promo-card-foot">
          {v.saved > 0 ? (
            <span className="promo-price">
              <s>{money(v.full)}</s> {money(v.final)}
            </span>
          ) : (
            <span className="promo-price">{v.items.length} ta taom</span>
          )}
          {left && <span className="promo-left"> {left}</span>}
        </div>
        <span className="promo-card-action">
          Taklifni ko‘rish <span aria-hidden="true">↗</span>
        </span>
      </div>
    </Link>
  );
}

/** Homepage promotions block — renders nothing when there are no live promotions. */
export function PromoSection({ promos, products, loaded = true }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const page = Math.max(1, Number.parseInt(params.get("promoPage") || "1", 10) || 1);
  const pagination = paginate(promos ?? [], page, PROMOTIONS_PER_PAGE);
  return (
    <section className="promo-section" id="aksiyalar">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Faqat hozir</div>
            <h2 className="section-title">Aksiyalar</h2>
          </div>
          <p className="section-intro">Hotdogdan maxsus takliflar — vaqt tugamasdan ulguring.</p>
        </div>
        {!promos?.length ? (
          <div className="no-results">{loaded ? "Hozircha aksiyalar yo‘q." : <SiteLoader />}</div>
        ) : (
          <div className="promo-grid">
            {pagination.items.map((p, i) => (
              <PromoCard key={p.id} promo={p} products={products} i={i} />
            ))}
          </div>
        )}
        <Pagination
          label="Aksiyalar"
          page={pagination.currentPage}
          pageCount={pagination.pageCount}
          onChange={(n) => {
            window.dispatchEvent(
              new CustomEvent("xonqa-pagination-navigation", { detail: "aksiyalar" }),
            );
            const url = new URL(window.location.href);
            if (n === 1) url.searchParams.delete("promoPage");
            else url.searchParams.set("promoPage", String(n));
            url.hash = "aksiyalar";
            navigate(`${url.pathname}${url.search}${url.hash}`, { preventScrollReset: true });
            requestAnimationFrame(() =>
              document
                .getElementById("aksiyalar")
                ?.scrollIntoView({ behavior: "smooth", block: "start" }),
            );
          }}
        />
      </div>
    </section>
  );
}

/** Fixed "back to top" button, bottom-right. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 500);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <Link className="admin-link" to="/admin">
        <LayoutDashboard size={17} /> Admin panel
      </Link>
      <button
        type="button"
        className={`to-top${show ? " show" : ""}`}
        aria-label="Tepaga qaytish"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M10 16V4M4 10l6-6 6 6" />
        </svg>
      </button>
    </>
  );
}

/** Shared shell for detail pages. */
export function DetailShell({ children, toast = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useCustomer();
  return (
    <div className="xonqa-site">
      <div className="grain" aria-hidden="true"></div>
      <header className="original-header">
        <nav className="nav wrap" aria-label="Asosiy navigatsiya">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <img src="/orinboy-madir-logo.jpeg" alt="Xonqa O'rinboy Hotdog logotipi" />
            </span>
            <span className="brand-name">
              XONQA O‘RINBOY<small>HOTDOG · OLOV TA’MI</small>
            </span>
          </Link>
          <div className="nav-actions">
            <Link to={user ? "/profil" : "/profil/login"} className="user-chip detail-login">
              <UserRound size={17} aria-hidden="true" />
              <span>{user ? "Profil" : "Kirish"}</span>
            </Link>
            <Link to="/?cart=open#menyu" className="detail-cart-link" aria-label="Savatni ochish">
              <ShoppingBasket size={19} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="detail-navigation"
              aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={menuOpen ? "M5 5l14 14M19 5L5 19" : "M3 7h18M3 12h18M3 17h18"} />
              </svg>
            </button>
          </div>
          <div
            id="detail-navigation"
            className={`nav-links${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Link to="/">Bosh sahifa</Link>
            <Link to="/#menyu">Menyuga qaytish</Link>
            <Link to="/stol-band-qilish">Stol band qilish</Link>
          </div>
        </nav>
      </header>
      {menuOpen && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Menyuni yopish"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <main className="detail-main">{children}</main>
      <BackToTop />
    </div>
  );
}

export function useToast() {
  const notify = (message: string) => {
    if (/xato|kiring|bo‘lmad|avval|telefon orqali/i.test(message)) sonnerToast.error(message);
    else sonnerToast.success(message);
  };
  return ["", notify] as const;
}
