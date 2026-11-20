import { readReceipt } from "@/lib/read-receipt";
import LocateAddress from "@/components/site/LocateAddress";
import CatalogImage from "@/components/site/CatalogImage";
import { ShoppingCart } from "lucide-react";
import {
  Minus,
  Plus,
  X,
  Truck,
  Store,
  MapPin,
  UserRound,
  ArrowLeft,
  Loader2,
  ShoppingBasket,
  Banknote,
  CreditCard,
  Copy,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CONTACT_CONFIG, money } from "../data/site";
import { loadMenu, createOrder, loadCard } from "@/admin/lib/admin.functions";
import { getMyOrderStatusFn, cancelMyOrderFn } from "@/admin/lib/db.functions";
import { STATUS_LABELS as ORDER_STATUS_LABEL } from "@/admin/lib/shop-types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomer, loadCart, saveCart, loadProfile, applyAppearance } from "@/lib/customer";
import { requireCustomerLogin } from "@/lib/customer-login";
import { supabase } from "@/integrations/supabase/client";
import "../styles/site.css";
import { toast as sonner } from "sonner";
import { addToHistory, patchHistory, adminNotify } from "@/lib/order-history";
import { BackToTop, PromoSection, loadPromos, promoCartProducts } from "./site-extras";
import Pagination from "@/components/site/Pagination";
import ProductCartControl from "@/components/site/ProductCartControl";
import {
  PRODUCTS_PER_PAGE,
  paginate,
  updateCartQuantity,
  normalizeRows,
  resolveCartItems,
  promoFallbackOrder,
} from "@/lib/shop-rules";

import SiteLoader from "@/components/site/SiteLoader";
import { sectionUrl } from "@/lib/section-url";
import { SiteHours, useSiteSettings } from "@/components/site/site-settings";

const txt = (v) => (v && typeof v === "object" ? (v.uz ?? v.ru ?? v.en ?? "") : (v ?? ""));

const Arrow = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 10h13M10 4l6 6-6 6" />
  </svg>
);

const gallery = [
  [
    "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "Olovda pishgan qizg‘ish hotdog",
    "Hotdogning issig‘ida",
  ],
  [
    "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=700",
    "Yangi salat va ko‘katlar",
    "Yangi ko‘katlar",
  ],
  [
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=700",
    "Dasturxonga tortilgan taom",
    "Dasturxonga tayyor",
  ],
  [
    "https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=700",
    "Issiq non va uy taomlari",
    "Issiq non bilan",
  ],
  [
    "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=700",
    "Yaqinlar bilan baham ko‘riladigan dasturxon",
    "Yaqinlar bilan bo‘lishing",
  ],
];

const BRANCH_MAP_URL = "";

export default function App() {
  const { allowShopping } = useSiteSettings();
  // Observe elements as they appear (including asynchronously loaded products).
  // The browser scroll position drives a separate reading-progress indicator.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".xonqa-site");
    if (!root) return;
    const targets =
      ".reveal, .menu-section, .story, .gallery, .promo-card, .product, .promise, .contact";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();
    const observer =
      !reduceMotion && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  observer?.unobserve(entry.target);
                }
              }
            },
            { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
          )
        : null;
    const register = () => {
      root.querySelectorAll(targets).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (observer) observer.observe(el);
        else el.classList.add("is-visible");
      });
    };
    register();
    const mutations = new MutationObserver(register);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
  }, []);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [card, setCard] = useState({ cardNumber: "", cardOwner: "" });
  useEffect(() => {
    loadCard()
      .then((c) => c && setCard(c))
      .catch(() => {});
  }, []);
  const [cart, setCart] = useState([]);
  const user = useCustomer();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // URL is the source of truth for shareable customer filters and pagination.
  const updateQuery = (patch: Record<string, string | null>, replace = false) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(patch)) {
          if (
            value == null ||
            value === "" ||
            (key === "page" && value === "1") ||
            (key === "category" && value === "all")
          )
            next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace, preventScrollReset: true },
    );
  };
  const [cartReady, setCartReady] = useState(false);
  useEffect(() => {
    setCartReady(false);
    if (!user) {
      setCart([]);
      return;
    }
    let active = true;
    setCart([]);
    loadCart(user.id)
      .then((rows) => {
        if (active) {
          setCart(rows);
          setCartReady(true);
        }
      })
      .catch((e) => console.error("Savatni yuklashda xato:", e));
    loadProfile(user.id)
      .then((profile) => {
        if (active) applyAppearance(profile);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  const needLogin = (
    returnTo = `${window.location.pathname}${window.location.search}${window.location.hash || "#menyu"}`,
  ) => {
    if (user === undefined) {
      showToast("Profil tekshirilmoqda, biroz kuting.");
      return true;
    }
    if (user) return false;
    requireCustomerLogin(navigate, returnTo);
    return true;
  };
  const [loaded, setLoaded] = useState(false);
  const [promos, setPromos] = useState([]);
  const [promosLoaded, setPromosLoaded] = useState(false);
  useEffect(() => {
    const refresh = () =>
      loadPromos()
        .then(setPromos)
        .catch((e) => console.error("Aksiyalarni yuklashda xato:", e))
        .finally(() => setPromosLoaded(true));
    refresh();
    const onVis = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("xonqa-db", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("xonqa-db", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    const sync = () =>
      loadMenu()
        .then((menu) => {
          setProducts(
            normalizeRows(menu.products).map((p) => ({
              ...p,
              name: txt(p.name),
              desc: txt(p.description ?? p.desc),
              weight: p.weight ?? "",
              tag: txt(p.tag),
            })),
          );
          setCategories(
            normalizeRows(menu.categories).map((item) => ({ ...item, label: txt(item.name) })),
          );
        })
        .catch(() => {});
    sync().finally(() => setLoaded(true));
    window.addEventListener("storage", sync);
    window.addEventListener("xonqa-db", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("xonqa-db", sync);
    };
  }, []);
  const category = searchParams.get("category") || "all";
  const filters = [
    { id: "all", label: "Barchasi" },
    ...categories.map((item) => ({ id: item.id, label: item.label })),
  ];
  const query = searchParams.get("q") || "";
  const productPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    if (searchParams.get("cart") !== "open") return;
    if (user === null) {
      requireCustomerLogin(navigate, "/?cart=open#menyu");
      return;
    }
    if (!loaded || !cartReady || !user) return;
    setCartOpen(true);
    updateQuery({ cart: null }, true);
  }, [searchParams, loaded, cartReady, user?.id]);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 767px)");
    const close = () => setNavOpen(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && navOpen) {
        close();
        document.querySelector<HTMLButtonElement>('[aria-controls="customer-navigation"]')?.focus();
      }
    };
    mobile.addEventListener("change", close);
    window.addEventListener("keydown", escape);
    return () => {
      mobile.removeEventListener("change", close);
      window.removeEventListener("keydown", escape);
    };
  }, [navOpen]);
  const sectionIds = [
    "bosh-sahifa",
    "aksiyalar",
    "menyu",
    "biz-haqimizda",
    "jarayon",
    "galereya",
    "aloqa",
  ];
  const [activeSection, setActiveSection] = useState(
    () => window.location.hash.slice(1) || "bosh-sahifa",
  );
  const progressRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const hoveredLinkRef = useRef<HTMLAnchorElement | null>(null);
  const pendingSectionRef = useRef<string | null>(null);
  const pendingDeadlineRef = useRef(0);

  // A single canonical URL writer. Query comes before the hash; page filters only
  // belong to their respective sections, never to #aloqa or #biz-haqimizda.
  const syncSectionUrl = (id: string) => {
    const next = sectionUrl(window.location.href, id);
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      navigate(next, { replace: true, preventScrollReset: true });
    }
  };

  // Move a single highlight, rather than changing each link's background.
  const positionPill = (link?: HTMLAnchorElement | null) => {
    const container = navLinksRef.current;
    const pill = pillRef.current;
    if (!container || !pill || window.matchMedia("(max-width: 767px)").matches) {
      if (pill) pill.style.opacity = "0";
      return;
    }
    const target = link ?? container.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
    if (!target) {
      pill.style.opacity = "0";
      return;
    }
    const parentRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    pill.style.width = `${targetRect.width}px`;
    pill.style.height = `${targetRect.height}px`;
    pill.style.transform = `translate3d(${targetRect.left - parentRect.left}px, ${targetRect.top - parentRect.top}px, 0)`;
    pill.style.opacity = "1";
  };

  useEffect(() => {
    positionPill(hoveredLinkRef.current);
    const observer = new ResizeObserver(() => positionPill(hoveredLinkRef.current));
    if (navLinksRef.current) observer.observe(navLinksRef.current);
    window.addEventListener("resize", onResize);
    function onResize() {
      positionPill(hoveredLinkRef.current);
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [activeSection, navOpen]);

  const navItem = (id: string) => (activeSection === id ? "active" : "");
  const activateSection = (id: string) => {
    setActiveSection(id);
    syncSectionUrl(id);
  };

  const handleNavClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (link) {
      const id = decodeURIComponent(link.hash.slice(1));
      const target = document.getElementById(id);
      if (target && sectionIds.includes(id)) {
        event.preventDefault();
        // Don't let intermediate frames of smooth scrolling reselect the previous section.
        pendingSectionRef.current = id;
        pendingDeadlineRef.current = performance.now() + 2400;
        activateSection(id);
        // The observer must never steal the clicked selection while smooth scrolling.
        // Use an explicit scroll destination so the sticky-header offset is exact.
        const headerHeight =
          document.querySelector<HTMLElement>(".xonqa-site header")?.getBoundingClientRect()
            .height ?? 76;
        const destinationY = Math.max(
          0,
          window.scrollY + target.getBoundingClientRect().top - headerHeight - 12,
        );
        window.scrollTo({
          top: destinationY,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }
    }
    setNavOpen(false);
  };

  useEffect(() => {
    let raf = 0;
    let scrollEndTimer: number | undefined;
    const header = document.querySelector<HTMLElement>(".xonqa-site header");

    const getSections = () =>
      sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const getHeaderHeight = () => header?.getBoundingClientRect().height ?? 76;
    const writeSection = (id: string) => {
      setActiveSection((prev) => (prev === id ? prev : id));
      syncSectionUrl(id);
    };
    const detect = () => {
      const sections = getSections();
      if (!sections.length) return;
      // Use a viewport probe, not the last section whose top crossed the navbar.
      // This avoids the previous-section lag for sections with tall content.
      const probe =
        getHeaderHeight() +
        Math.min(180, Math.max(70, (window.innerHeight - getHeaderHeight()) * 0.28));
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= probe) current = section.id;
        else break;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3)
        current = sections[sections.length - 1].id;
      writeSection(current);
    };
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = Math.max(0, doc.scrollHeight - window.innerHeight);
      if (progressRef.current)
        progressRef.current.style.transform = `scaleX(${max ? Math.max(0, Math.min(1, window.scrollY / max)) : 0})`;
      if (pendingSectionRef.current && performance.now() > pendingDeadlineRef.current)
        pendingSectionRef.current = null;
      if (!pendingSectionRef.current) detect();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const releasePending = () => {
      if (!pendingSectionRef.current) return;
      const id = pendingSectionRef.current;
      const target = document.getElementById(id);
      if (target) {
        const headerHeight = getHeaderHeight();
        const targetY = Math.max(
          0,
          window.scrollY + target.getBoundingClientRect().top - headerHeight - 12,
        );
        if (
          Math.abs(window.scrollY - targetY) > 4 &&
          performance.now() < pendingDeadlineRef.current
        )
          return;
      }
      pendingSectionRef.current = null;
      schedule();
    };
    const onScroll = () => {
      schedule();
      if (scrollEndTimer !== undefined) window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(releasePending, 160);
    };
    const cancelPending = () => {
      pendingSectionRef.current = null;
      if (scrollEndTimer !== undefined) window.clearTimeout(scrollEndTimer);
      schedule();
    };
    // Observers schedule measurement; only scroll/viewport geometry decides which section is active.
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(schedule, {
            rootMargin: "-15% 0px -55% 0px",
            threshold: [0, 0.1, 0.5],
          })
        : null;
    getSections().forEach((section) => observer?.observe(section));
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (header) resizeObserver?.observe(header);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", cancelPending, { passive: true });
    window.addEventListener("touchstart", cancelPending, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    function onKeyDown(event: KeyboardEvent) {
      if (
        ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key) &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)
      )
        cancelPending();
    }
    const onPaginationNavigation = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!sectionIds.includes(id)) return;
      pendingSectionRef.current = id;
      pendingDeadlineRef.current = performance.now() + 2800;
      setActiveSection(id);
      schedule();
    };
    window.addEventListener("xonqa-pagination-navigation", onPaginationNavigation);
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      const id = hash === "menu" ? "menyu" : hash;
      if (sectionIds.includes(id)) {
        pendingSectionRef.current = id;
        pendingDeadlineRef.current = performance.now() + 1500;
        writeSection(id);
      }
      schedule();
    };
    window.addEventListener("hashchange", onHashChange);
    schedule();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", cancelPending);
      window.removeEventListener("touchstart", cancelPending);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("xonqa-pagination-navigation", onPaginationNavigation);
      observer?.disconnect();
      resizeObserver?.disconnect();
      if (scrollEndTimer !== undefined) window.clearTimeout(scrollEndTimer);
      cancelAnimationFrame(raf);
    };
  }, []);
  const [toast, setToast] = useState({ text: "", show: false });
  const [sending, setSending] = useState(false);

  const closeBtn = useRef<HTMLButtonElement>(null);
  const openBtn = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (loaded && user && cartReady)
      saveCart(user.id, cart).catch((e) => console.error("Savatni saqlashda xato:", e));
  }, [cart, loaded, user, cartReady]);

  useEffect(() => {
    document.querySelector(".xonqa-site")?.classList.toggle("locked", cartOpen);
    document.body.style.overflow = cartOpen ? "hidden" : "";
    if (cartOpen) closeBtn.current?.focus();
    else if (!firstRender.current) openBtn.current?.focus();
    firstRender.current = false;
    const onKey = (e) => e.key === "Escape" && setCartOpen(false);
    if (cartOpen) document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const showToast = (text) => {
    sonner(text);
  };
  const [activeOrder, setActiveOrder] = useState(null);
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem("activeOrder") || "null");
      if (a?.id) setActiveOrder(a);
    } catch {
      /* Optional browser feature or stored preference. */
    }
  }, []);
  useEffect(() => {
    if (!activeOrder?.id) return;
    localStorage.setItem("activeOrder", JSON.stringify(activeOrder));
    if (["cancelled", "delivered", "picked_up"].includes(activeOrder.status)) return;
    const apply = (st, reason) => {
      if (!st) return;
      setActiveOrder((a) => {
        if (!a || a.status === st) return a;
        patchHistory(a.id, { status: st, cancelReason: reason || "" });
        if (!a.statusFeed && !(st === "cancelled" && a.selfCancel))
          setTimeout(() => adminNotify(a.id, st, reason), 0);
        return { ...a, status: st };
      });
    };
    const poll = () =>
      getMyOrderStatusFn({ data: { id: activeOrder.id, phone: activeOrder.phone } })
        .then((r) => apply(r?.status, r?.cancelReason))
        .catch(() => {});
    window.addEventListener("xonqa-db", poll);
    const t = setInterval(poll, 15000);
    return () => {
      clearInterval(t);
      window.removeEventListener("xonqa-db", poll);
    };
  }, [activeOrder?.id, activeOrder?.status]);
  const cancelActiveOrder = async () => {
    if (!activeOrder) return;
    try {
      await cancelMyOrderFn({ data: { id: activeOrder.id, phone: activeOrder.phone } });
      patchHistory(activeOrder.id, {
        status: "cancelled",
        cancelReason: "Mijozning o‘zi bekor qildi",
      });
      setActiveOrder((a) => ({ ...a, status: "cancelled", selfCancel: true }));
      sonner.success(`Buyurtma #${activeOrder.id} bekor qilindi.`);
    } catch (e) {
      try {
        const r = await getMyOrderStatusFn({
          data: { id: activeOrder.id, phone: activeOrder.phone },
        });
        if (r?.status) setActiveOrder((a) => ({ ...a, status: r.status }));
      } catch {
        /* Optional browser feature or stored preference. */
      }
      sonner.error(e.message || "Buyurtmani bekor qilib bo‘lmadi.");
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("uz");
    return products.filter(
      (p) =>
        (category === "all" ||
          !categories.some((c) => c.id === category) ||
          p.category === category) &&
        `${p.name} ${p.desc} ${p.tag}`.toLocaleLowerCase("uz").includes(q),
    );
  }, [category, query, products]);

  const cartItems = resolveCartItems(cart, [...products, ...promoCartProducts(promos, products)]);
  const count = cartItems.reduce((n, i) => n + i.qty, 0);
  const total = cartItems.reduce((n, i) => n + (Number(i.product.price) || 0) * i.qty, 0);
  const productPagination = paginate(visible, productPage, PRODUCTS_PER_PAGE);
  const addToCart = (id) => {
    if (needLogin() || !loaded || !cartReady || !allowShopping()) return;
    setCart((current) => updateCartQuantity(current, id, 1));
    showToast("Taom savatga qo‘shildi");
  };
  const changeQty = (id, delta) => {
    if (!needLogin() && loaded && cartReady && allowShopping())
      setCart((current) => updateCartQuantity(current, id, delta));
  };

  const removeFromCart = (id) => {
    if (allowShopping()) setCart(cart.filter((i) => i.id !== id));
  };

  const [step, setStep] = useState(0); // 0 savat, 1 usul, 2 manzil, 3 telefon, 4 izoh, 5 to'lov
  const [order, setOrder] = useState({
    method: "",
    address: "",
    phone: "",
    comment: "",
    payment: "",
    location: null,
    receipt: "",
  });

  useEffect(() => {
    setOrder((current) => ({
      ...current,
      address: user?.user_metadata?.delivery_address || "",
      location: user?.user_metadata?.delivery_point || null,
    }));
  }, [
    user?.id,
    user?.user_metadata?.delivery_address,
    user?.user_metadata?.delivery_point?.lat,
    user?.user_metadata?.delivery_point?.lng,
  ]);
  const setO = (k, v) => setOrder((o) => ({ ...o, [k]: v }));
  useEffect(() => {
    if (!cartOpen) setStep(0);
  }, [cartOpen]);
  const startCheckout = () => {
    if (needLogin() || !loaded || !cartReady || !allowShopping()) return;
    if (!cartItems.length) return showToast("Buyurtma berish uchun avval savatga taom qo‘shing.");
    setStep(1);
  };
  const pickMethod = (m) => {
    setO("method", m);
    setStep(2);
  };
  const phoneFromProfile = async () => {
    try {
      const pr = await loadProfile(user.id);
      if (pr?.phone) setO("phone", pr.phone);
      else showToast("Profilingizda telefon raqam yo‘q.");
    } catch {
      showToast("Profilni yuklab bo‘lmadi.");
    }
  };
  const nextIf = (ok, msg, to) => (ok ? setStep(to) : showToast(msg));
  const submitOrder = async (payment) => {
    if (needLogin() || sending || !loaded || !cartReady || !allowShopping()) return;
    if (!cartItems.length) return showToast("Buyurtma berish uchun avval savatga taom qo‘shing.");
    setO("payment", payment);
    setSending(true);
    try {
      let name = "";
      try {
        const pr = await loadProfile(user.id);
        name = pr?.full_name || "";
      } catch {
        /* Optional browser feature or stored preference. */
      }
      if (name.trim().length < 2)
        name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mijoz";
      const delivery0 = [
        order.method === "delivery" ? `Yetkazib berish: ${order.address}` : "O‘zim olib ketaman",
        `To‘lov: ${payment === "cash" ? "Naqd" : "Karta"}`,
        order.comment.trim() ? `Izoh: ${order.comment.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const v2 = {
        name: name.trim(),
        phone: order.phone.trim(),
        delivery: delivery0,
        method: order.method,
        address: order.address.trim(),
        location: order.method === "delivery" ? order.location : null,
        comment: order.comment.trim(),
        payment,
        receipt: payment === "card" ? order.receipt : "",
        items: cartItems.map((i) =>
          i.product.promoId
            ? { promoId: i.product.promoId, quantity: i.qty }
            : { productId: i.id, quantity: i.qty },
        ),
      };
      let created;
      try {
        created = await createOrder(v2);
      } catch (e) {
        // Eski server aksiyani tanimaydi ("Mahsulot topilmadi: undefined"). Aksiya tarkibini oddiy taom qilib yuboramiz.
        if (!/topilmadi:\s*undefined/i.test(String(e?.message)) || !v2.items.some((i) => i.promoId))
          throw e;
        const fb = promoFallbackOrder(v2.items, promos, cartItems);
        created = await createOrder({
          ...v2,
          items: fb.items,
          comment: [v2.comment, fb.note].filter(Boolean).join("\n").slice(0, 500),
          delivery: [v2.delivery, fb.note].join("\n"),
        });
      }
      const result = { orderNumber: created.id };
      setActiveOrder({ statusFeed: true, id: result.orderNumber, phone: v2.phone, status: "new" });
      addToHistory({
        id: result.orderNumber,
        phone: v2.phone,
        status: "new",
        createdAt: new Date().toISOString(),
        method: order.method,
        address: order.address.trim(),
        payment,
        comment: order.comment.trim(),
        total,
        items: cartItems.map((i) => ({
          name: i.product.name,
          qty: i.qty,
          price: Number(i.product.price) || 0,
        })),
      });
      setCart([]);
      setOrder({
        method: "",
        address: "",
        phone: "",
        comment: "",
        payment: "",
        location: null,
        receipt: "",
      });
      setStep(0);
      setCartOpen(false);
      showToast(
        result?.orderNumber
          ? `Buyurtma #${result.orderNumber} yuborildi. Qabul qilinishini kuting.`
          : "Buyurtmangiz yuborildi. Qabul qilinishini kuting.",
      );
    } catch (error) {
      showToast(error.message || "Ulanishda xatolik. Internetni tekshirib, qayta urinib ko‘ring.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="xonqa-site">
      <div className="grain" aria-hidden="true"></div>
      <div className="topline">
        Xonqa usuli — <span>tirik olov</span> va sabr bilan
      </div>
      <header className="original-header" inert={cartOpen}>
        <nav className="nav wrap" aria-label="Asosiy navigatsiya">
          <a className="brand" href="#bosh-sahifa" aria-label="Xonqa O'rinboy Hotdog bosh sahifasi">
            <span className="brand-mark">
              <img src="/orinboy-madir-logo.jpeg" alt="Xonqa O'rinboy Hotdog logotipi" />
            </span>
            <span className="brand-name">
              XONQA O‘RINBOY<small>HOTDOG · OLOV TA’MI</small>
            </span>
          </a>
          <div
            ref={navLinksRef}
            id="customer-navigation"
            className={`nav-links${navOpen ? " open" : ""}`}
            onClick={handleNavClick}
            onMouseOver={(event) => {
              const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a");
              if (link && navLinksRef.current?.contains(link)) {
                hoveredLinkRef.current = link;
                positionPill(link);
              }
            }}
            onMouseLeave={() => {
              hoveredLinkRef.current = null;
              positionPill();
            }}
            onFocusCapture={(event) => {
              const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a");
              if (link) positionPill(link);
            }}
            onBlurCapture={() => {
              if (!hoveredLinkRef.current) positionPill();
            }}
          >
            <span ref={pillRef} className="nav-floating-pill" aria-hidden="true" />
            <a
              className={navItem("aksiyalar")}
              aria-current={activeSection === "aksiyalar" ? "location" : undefined}
              href="#aksiyalar"
            >
              Aksiyalar
            </a>
            <a
              className={navItem("menyu")}
              aria-current={activeSection === "menyu" ? "location" : undefined}
              href="#menyu"
            >
              Menyu
            </a>
            <a
              className={navItem("biz-haqimizda")}
              aria-current={activeSection === "biz-haqimizda" ? "location" : undefined}
              href="#biz-haqimizda"
            >
              Biz haqimizda
            </a>
            <a
              className={navItem("jarayon")}
              aria-current={activeSection === "jarayon" ? "location" : undefined}
              href="#jarayon"
            >
              Hotdog siri
            </a>
            <a
              className={navItem("galereya")}
              aria-current={activeSection === "galereya" ? "location" : undefined}
              href="#galereya"
            >
              Galereya
            </a>
            <a
              className={navItem("aloqa")}
              aria-current={activeSection === "aloqa" ? "location" : undefined}
              href="#aloqa"
            >
              Aloqa
            </a>
            <a href="/stol-band-qilish">Stol band qilish</a>
          </div>
          <div className="nav-actions">
            <a className="nav-order" href="#menyu">
              Buyurtma berish
            </a>
            <Link
              className="user-chip detail-login"
              to={user ? "/profil" : "/profil/login"}
              title={user ? "Profil sozlamalari" : "Kirish"}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              <span>{user ? "Profil" : "Kirish"}</span>
            </Link>
            <button
              ref={openBtn}
              className="cart-toggle detail-cart-link"
              aria-label="Savatni ochish"
              onClick={() => {
                if (needLogin("/?cart=open#menyu")) return;
                if (loaded && cartReady && allowShopping()) setCartOpen(true);
              }}
            >
              <ShoppingCart size={19} aria-hidden="true" />
              <span className="cart-count">{count}</span>
            </button>
            <button
              type="button"
              className="menu-toggle"
              aria-controls="customer-navigation"
              aria-label={navOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(!navOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={navOpen ? "M5 5l14 14M19 5L5 19" : "M3 7h18M3 12h18M3 17h18"} />
              </svg>
            </button>
          </div>
        </nav>
        <div className="header-scroll-track" aria-hidden="true">
          <div ref={progressRef} className="header-scroll-fill" />
        </div>
      </header>

      {navOpen && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Menyuni yopish"
          onClick={() => setNavOpen(false)}
        />
      )}
      <main inert={cartOpen || navOpen}>
        <section className="hero" id="bosh-sahifa">
          <div className="wrap">
            <div className="hero-content">
              <div className="eyebrow">Xonqadan kelgan haqiqiy ta’m</div>
              <h1>
                Olovda.
                <br />
                <em>Sabr bilan.</em>
              </h1>
              <p className="hero-copy">
                Hotdogning issig‘i, ziravorning ifori va dasturxonga tortilgan paytdagi o‘sha
                unutilmas lahza.
              </p>
              <div className="hero-ctas">
                <a className="button" href="#menyu">
                  Menyuni ko‘rish <Arrow />
                </a>
                <a href="/stol-band-qilish" className="text-link">
                  Stol band qilish
                </a>
              </div>
            </div>
          </div>
          <div className="hero-stamp" aria-label="Har kuni yangi tayyorlanadi">
            <div>
              <strong>100%</strong>OLovda
              <br />
              pishadi
            </div>
          </div>
          <div className="hero-note">Har kuni yangi hotdog</div>
        </section>

        <div className="ticker" aria-label="Bizning va’damiz">
          <div className="ticker-track">
            {[0, 1].flatMap((k) =>
              ["Xonqa usuli", "Tabiiy olov", "Yangi masalliqlar", "Mehmon uchun mehr"].flatMap(
                (t) => [<span key={k + t}>{t}</span>, <b key={k + t + "b"}>✳</b>],
              ),
            )}
          </div>
        </div>

        <PromoSection promos={promos} products={products} loaded={promosLoaded} />

        <section className="menu-section" id="menyu">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">Hotdogimizdan dasturxonga</div>
                <h2 className="section-title">Menyu</h2>
              </div>
              <p className="section-intro">
                Olovni to‘g‘ri tutish, ziravorni me’yorida ishlatish — har bir luqmada bilinadi.
                O‘zingizga yoqqanini tanlang.
              </p>
            </div>
            <div className="menu-controls" aria-label="Menyu filtrlari">
              {filters.map((f) => (
                <button
                  key={f.id}
                  className={`filter${category === f.id ? " active" : ""}`}
                  aria-pressed={category === f.id}
                  onClick={() => updateQuery({ category: f.id, page: null })}
                >
                  {f.label}
                </button>
              ))}
              <label className="search-box">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8.8" cy="8.8" r="5.8" />
                  <path d="m13 13 4 4" />
                </svg>
                <input
                  type="search"
                  placeholder="Menyudan izlash..."
                  aria-label="Menyudan izlash"
                  value={query}
                  onChange={(e) => updateQuery({ q: e.target.value, page: null }, true)}
                />
              </label>
            </div>
            <div className="product-grid" aria-live="polite">
              {visible.length === 0 ? (
                query.trim() ? (
                  <div className="no-results">
                    Bu qidiruvga mos taom topilmadi. Boshqa so‘z bilan izlab ko‘ring.
                  </div>
                ) : (
                  <div className="no-results">
                    {loaded ? "Bu bo‘limda hozircha taom yo‘q." : <SiteLoader />}
                  </div>
                )
              ) : (
                productPagination.items.map((p, i) => (
                  <article
                    key={p.id + category + query}
                    className="product"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <Link to={`/mahsulot/${p.id}`} className="product-image">
                      <CatalogImage src={p.image} alt={p.name} loading="lazy" />
                      {p.tag && <span className="product-tag">{p.tag}</span>}
                      <span className="product-image-hint" aria-hidden="true">
                        Batafsil ko‘rish <ArrowUpRight size={15} aria-hidden="true" />
                      </span>
                    </Link>
                    <div className="product-body">
                      <div className="product-top">
                        <h3>
                          <Link to={`/mahsulot/${p.id}`}>{p.name}</Link>
                        </h3>
                      </div>
                      <p className="product-desc">{p.desc}</p>
                      <div className="product-bottom">
                        <div className="product-meta">
                          {p.weight && <span className="weight">{p.weight}</span>}
                          <strong className="product-price">{money(p.price)}</strong>
                        </div>
                        <ProductCartControl
                          product={p}
                          quantity={cart.find((item) => item.id === p.id)?.qty ?? 0}
                          onChange={(delta) => changeQty(p.id, delta)}
                          onAdd={() => addToCart(p.id)}
                        />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
            <Pagination
              label="Mahsulotlar"
              page={productPagination.currentPage}
              pageCount={productPagination.pageCount}
              onChange={(n) => {
                window.dispatchEvent(
                  new CustomEvent("xonqa-pagination-navigation", { detail: "menyu" }),
                );
                const url = new URL(window.location.href);
                if (n === 1) url.searchParams.delete("page");
                else url.searchParams.set("page", String(n));
                url.hash = "menyu";
                navigate(`${url.pathname}${url.search}${url.hash}`, { preventScrollReset: true });
                requestAnimationFrame(() =>
                  document
                    .getElementById("menyu")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
            />
          </div>
        </section>

        <section className="story" id="biz-haqimizda">
          <div className="wrap story-grid">
            <div className="story-visual">
              <img
                src="https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=1100"
                alt="Olovda qizargan o'rinboy hotdog, dasturxon ustida"
                loading="lazy"
              />
              <div className="story-badge">
                <div>
                  <small>Har luqmada</small>Xonqa
                  <br />
                  mehri
                </div>
              </div>
            </div>
            <div>
              <div className="eyebrow">Bizning hikoyamiz</div>
              <h2 className="section-title">
                Ta’mning ildizi —<br />
                Xonqada.
              </h2>
              <p className="story-copy">
                Hotdog hotdog shunchaki taom emas. U hotdog devoriga yopishtirilgan xamir non,
                qizigan ko‘mir va sabrning hikoyasi. Biz shu oddiy, lekin e’tibor talab qiladigan
                usulni asrab, har kuni yangi dasturxon yozamiz.
              </p>
              <p className="story-copy">
                Har bir hotdog o‘z vaqtida ziravorlanadi, o‘z issig‘ida pishadi. Shoshilmaymiz —
                chunki yaxshi ta’mning o‘z vaqti bor.
              </p>
              <div className="story-points">
                <div className="story-point">
                  <strong>Tabiiy</strong>
                  <span>Olov va ko‘mir harorati</span>
                </div>
                <div className="story-point">
                  <strong>Har kuni</strong>
                  <span>Yangi tayyorlangan taom</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="promise" id="jarayon">
          <div className="wrap promise-grid">
            <div>
              <div className="eyebrow">Hotdog siri</div>
              <h2 className="section-title">
                Yaxshi ta’m
                <br />
                shoshilmaydi.
              </h2>
              <p className="promise-copy">
                Olovni uyg‘otamiz. Hotdog qiziguncha ziravorlar o‘z ishini qiladi. So‘ng hotdogni
                ichkariga tushiramiz — issiqlikni emas, vaqtni boshqaramiz.
              </p>
              <div className="promise-list">
                {[
                  ["01 / Tanlaymiz", "Yangi, sifatli masalliq"],
                  ["02 / Marinadlaymiz", "O‘ziga xos ziravor aralashmasi"],
                  ["03 / Hotdoglaymiz", "Olovning to‘g‘ri haroratida"],
                  ["04 / Tortamiz", "Issig‘ida, mehr bilan"],
                ].map(([b, s]) => (
                  <div className="promise-item" key={b}>
                    <b>{b}</b>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="promise-art">
              <img
                src="https://images.pexels.com/photos/2232/vegetables-italian-pizza-restaurant.jpg?auto=compress&cs=tinysrgb&w=1000"
                alt="Yangi ziravorlar va masalliqlar"
                loading="lazy"
              />
              <div className="art-caption">Olovga hurmat. Ta’mga e’tibor.</div>
            </div>
          </div>
        </section>

        <section className="gallery" id="galereya">
          <div className="wrap">
            <div className="gallery-head">
              <div>
                <div className="eyebrow">Dasturxondan lavhalar</div>
                <h2 className="section-title">Ko‘z bilan tatib ko‘ring.</h2>
              </div>
            </div>
            <div className="gallery-grid">
              {!gallery.length && (
                <p role="status" className="wrap no-results">
                  Hozircha galereyada rasm yo‘q.
                </p>
              )}
              {gallery.map(([src, alt, label]) => (
                <div className="gallery-item" key={label}>
                  <img src={src} alt={alt} loading="lazy" />
                  <span className="gallery-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-section">
          <div className="wrap order-inner">
            <div>
              <div className="eyebrow">Dasturxonni hozirlash vaqti</div>
              <h2 className="section-title">Olovdan — sizga.</h2>
              <p>
                Menyudan tanlang va savatni to‘ldiring. Buyurtmani shu saytning o‘zidan yuboring —
                tasdiq raqami darhol ko‘rinadi.
              </p>
            </div>
            <a href="#menyu" className="button">
              Taom tanlash <Arrow />
            </a>
          </div>
        </section>

        <section className="contact" id="aloqa">
          <div className="wrap">
            <div className="contact-grid">
              <div>
                <div className="eyebrow">Biz bilan bog‘laning</div>
                <h2 className="section-title">
                  Dasturxoningizga
                  <br />
                  taklif qilamiz.
                </h2>
                <p className="contact-note">
                  Buyurtmani savatdan sayt orqali yuboring. Savollar bo‘lsa, telefon yoki Instagram
                  orqali bog‘laning.
                </p>
                <div className="contact-links">
                  {CONTACT_CONFIG.phone.trim() ? (
                    <a
                      className="contact-link"
                      href={`tel:${CONTACT_CONFIG.phone.replace(/[^\d+]/g, "")}`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 2h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
                        <path d="M8 15h4" />
                      </svg>
                      {CONTACT_CONFIG.phone}
                    </a>
                  ) : (
                    <span className="contact-link disabled">Telefon — ma’lumot kutilmoqda</span>
                  )}
                  {CONTACT_CONFIG.instagramUrl.trim() ? (
                    <a
                      className="contact-link"
                      href={CONTACT_CONFIG.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @xonqa.hotdog.hotdog ↗
                    </a>
                  ) : (
                    <span className="contact-link disabled">Instagram — ma’lumot kutilmoqda</span>
                  )}
                  <a className="contact-link" href="#menyu" aria-label="Menyu va buyurtma">
                    Menyu va buyurtma ↗
                  </a>
                </div>
              </div>
              <div className="contact-right">
                <div className="contact-detail">
                  <span>Manzil</span>
                  <p>Xonqa tumani</p>
                </div>
                <div className="contact-detail">
                  <span>Ish vaqti</span>
                  <p>
                    <SiteHours />
                  </p>
                </div>
                <div className="contact-detail">
                  <span>Buyurtma</span>
                  <p>
                    Sayt orqali
                    <br />
                    <small>Savatdan buyurtma bering</small>
                  </p>
                </div>
                <div className="contact-detail">
                  <span>Bizning usul</span>
                  <p>
                    Xonqa hotdogi
                    <br />
                    <small>Har kuni yangi tayyorlanadi</small>
                  </p>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} XONQA O'RINBOY HOTDOG</span>
              <span>OLOVDA PISHADI · MEHR BILAN TORTILADI</span>
            </div>
          </div>
        </section>
      </main>

      <BackToTop />
      <div
        className={`overlay${cartOpen ? " open" : ""}`}
        aria-hidden={!cartOpen}
        onClick={() => setCartOpen(false)}
      ></div>
      <aside
        className={`cart-panel${cartOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartTitle"
        aria-hidden={!cartOpen}
        inert={!cartOpen}
      >
        <div className="cart-head">
          <h2 id="cartTitle">Sizning savatingiz</h2>
          <button
            ref={closeBtn}
            className="close-cart"
            aria-label="Savatni yopish"
            onClick={() => setCartOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="cart-items">
          {!loaded || (user && !cartReady) ? (
            <SiteLoader />
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <div>
                <strong>Savat hozircha bo‘sh.</strong>Yoqtirgan taomingizni tanlang — biz hotdogni
                qizdiramiz.
              </div>
            </div>
          ) : (
            cartItems.map((item) => {
              const p = item.product;
              return (
                <div className="cart-row" key={p.id}>
                  <CatalogImage src={p.image} alt="" />
                  <div>
                    <h3>{p.name}</h3>
                    <small>
                      {p.full > p.price && <s>{money(p.full)}</s>} {money(p.price)} · {p.weight}
                    </small>
                    <div className="qty">
                      <button
                        type="button"
                        aria-label={`${p.name} miqdorini kamaytirish`}
                        onClick={() => changeQty(p.id, -1)}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <span>{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`${p.name} miqdorini oshirish`}
                        onClick={() => changeQty(p.id, 1)}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="remove-item"
                        type="button"
                        aria-label={`${p.name}ni savatdan olib tashlash`}
                        title="Olib tashlash"
                        onClick={() => removeFromCart(p.id)}
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12M8.5 8.5v5M11.5 8.5v5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className="cart-row-total">{money(p.price * item.qty)}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="checkout">
          <div className="checkout-total">
            <span>Jami to‘lov</span>
            <strong>{money(total)}</strong>
          </div>
          {step === 0 ? (
            <button
              className="button"
              type="button"
              onClick={startCheckout}
              disabled={!loaded || !cartReady || !cartItems.length}
            >
              Buyurtma berish <Arrow />
            </button>
          ) : (
            <div className="checkout-step">
              <button
                type="button"
                className="step-back back-btn"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Orqaga
              </button>
              {step === 1 && (
                <>
                  <p className="step-title">Buyurtmani qanday olasiz?</p>
                  <div className="choice-grid">
                    <button type="button" className="choice" onClick={() => pickMethod("delivery")}>
                      <Truck size={20} aria-hidden="true" /> Yetkazib berish
                    </button>
                    <button type="button" className="choice" onClick={() => pickMethod("pickup")}>
                      <Store size={20} aria-hidden="true" /> O‘zim olib ketaman
                    </button>
                  </div>
                </>
              )}
              {step === 2 && order.method === "pickup" && (
                <>
                  <p className="step-title">Olib ketish</p>
                  <p>
                    Buyurtmangizni bizning filialimizdan olib ketasiz. Tayyor bo‘lganda xabar
                    yuborishimizni kuting.
                  </p>
                  {BRANCH_MAP_URL && (
                    <a
                      className="choice"
                      href={BRANCH_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textAlign: "center" }}
                    >
                      {" "}
                      Filial manzili (xaritada ochish)
                    </a>
                  )}
                  <button className="button" type="button" onClick={() => setStep(3)}>
                    Davom etish <Arrow />
                  </button>
                </>
              )}
              {step === 2 && order.method !== "pickup" && (
                <>
                  <p className="step-title">Yetkazib berish manzili</p>
                  <LocateAddress
                    value={order.address}
                    onFound={(point) =>
                      setOrder((current) => ({ ...current, address: point.name, location: point }))
                    }
                  />
                  <textarea
                    rows={2}
                    value={order.address}
                    onChange={(e) => {
                      setO("address", e.target.value);
                      setO("location", null);
                    }}
                    placeholder="Yoki manzil va mo‘ljalni yozing"
                  />
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      nextIf(order.address.trim().length >= 4, "Manzilni kiriting.", 3)
                    }
                  >
                    Davom etish <Arrow />
                  </button>
                </>
              )}
              {step === 3 && (
                <>
                  <p className="step-title">Telefon raqamingiz</p>
                  <button type="button" className="choice" onClick={phoneFromProfile}>
                    <UserRound size={17} aria-hidden="true" /> Profildan olish
                  </button>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={order.phone}
                    onChange={(e) => setO("phone", e.target.value)}
                    placeholder="+998 ..."
                  />
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      nextIf(
                        /^\+?[0-9 ()-]{7,20}$/.test(order.phone.trim()),
                        "To‘g‘ri telefon raqam kiriting.",
                        4,
                      )
                    }
                  >
                    Davom etish <Arrow />
                  </button>
                </>
              )}
              {step === 4 && (
                <>
                  <p className="step-title">Izoh (ixtiyoriy)</p>
                  <textarea
                    rows={3}
                    value={order.comment}
                    onChange={(e) => setO("comment", e.target.value)}
                    placeholder="Masalan: achchiq bo‘lmasin, qo‘ng‘iroq qiling..."
                  />
                  <div className="choice-grid">
                    <button
                      type="button"
                      className="choice"
                      onClick={() => {
                        setO("comment", "");
                        setStep(5);
                      }}
                    >
                      O‘tkazib yuborish
                    </button>
                    <button className="button" type="button" onClick={() => setStep(5)}>
                      Davom etish
                    </button>
                  </div>
                </>
              )}
              {step === 5 && (
                <>
                  <p className="step-title">To‘lov usuli</p>
                  <div className="choice-grid">
                    <button
                      type="button"
                      className="choice"
                      disabled={sending}
                      onClick={() => submitOrder("cash")}
                    >
                      <Banknote size={19} aria-hidden="true" /> Naqd
                    </button>
                    <button
                      type="button"
                      className="choice"
                      disabled={sending}
                      onClick={() => setStep(6)}
                    >
                      <CreditCard size={19} aria-hidden="true" /> Karta
                    </button>
                  </div>
                  {sending ? <SiteLoader compact /> : null}
                </>
              )}
              {step === 6 && (
                <>
                  <p className="step-title">Karta orqali to‘lov</p>
                  <div className="choice" style={{ textAlign: "center", cursor: "default" }}>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Quyidagi kartaga pul o‘tkazing:
                    </div>
                    <div
                      style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, margin: "6px 0" }}
                    >
                      {card.cardNumber
                        ? card.cardNumber.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ")
                        : "Karta raqami hali kiritilmagan"}
                    </div>
                    {card.cardOwner ? (
                      <div style={{ fontWeight: 600 }}>{card.cardOwner}</div>
                    ) : null}
                    {card.cardNumber ? (
                      <button
                        type="button"
                        className="button"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          navigator.clipboard?.writeText(card.cardNumber.replace(/\D/g, ""));
                          showToast("Karta raqami nusxalandi");
                        }}
                      >
                        <Copy size={17} aria-hidden="true" /> Nusxalash
                      </button>
                    ) : null}
                  </div>
                  <p style={{ margin: "8px 0" }}>
                    Shu kartaga pul o‘tkazib, chekni rasm yoki PDF ko‘rinishida yuboring.
                  </p>
                  <label className="choice" style={{ cursor: "pointer", textAlign: "center" }}>
                    Rasm yoki PDF tanlash
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f)
                          readReceipt(f)
                            .then((d) => setO("receipt", d))
                            .catch((er) =>
                              showToast(
                                er.message !== "bad" ? er.message : "Faylni o‘qib bo‘lmadi.",
                              ),
                            );
                      }}
                    />
                  </label>
                  {order.receipt?.startsWith("data:application/pdf") ? (
                    <p> PDF chek tanlandi</p>
                  ) : order.receipt ? (
                    <img
                      src={order.receipt}
                      alt="Chek"
                      style={{ maxHeight: 220, width: "100%", objectFit: "contain" }}
                    />
                  ) : null}
                  <button
                    className="button"
                    type="button"
                    disabled={sending}
                    onClick={() =>
                      order.receipt
                        ? submitOrder("card")
                        : showToast("Avval chekni (rasm yoki PDF) tanlang.")
                    }
                  >
                    Buyurtmani yuborish <Arrow />
                  </button>
                  {sending ? <SiteLoader compact /> : null}
                </>
              )}
            </div>
          )}
          {step > 0 ? (
            <button
              type="button"
              className="button cancel-order-btn"
              onClick={() => {
                setStep(0);
                showToast("Buyurtma berish bekor qilindi.");
              }}
            >
              Bekor qilish
            </button>
          ) : null}
          {activeOrder?.status === "new" ? (
            <button type="button" className="button cancel-order-btn" onClick={cancelActiveOrder}>
              Buyurtma #{activeOrder.id} ni bekor qilish
            </button>
          ) : null}
          <p className="checkout-hint">Buyurtma raqami darhol ko‘rsatiladi.</p>
        </div>
      </aside>
    </div>
  );
}
