import { useStoreState } from "@/store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { playOrderSound, unlockSound } from "@/admin/lib/notify";
import { useSettings } from "@/admin/store/settings-store";
import { fmtSum } from "@/admin/lib/shop-types";
import { toast } from "sonner";
import {
  getAdminData,
  removeProduct,
  removePromotion,
  saveProduct,
  savePromotion,
  updateOrderStatus,
  saveCategory,
  removeCategory,
  reorderCategories,
  updateReservationStatus,
  saveVenueTable,
  deleteVenueTable,
} from "@/admin/lib/admin.functions";
const AUTH_KEY = "eb-admin-auth";
function getCreds() {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(localStorage.getItem(AUTH_KEY) ?? "null");
    return v && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
const AdminContext = createContext<any>(null);
function AdminStoreProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [products, setProducts] = useStoreState("admin", "products");
  const [orders, setOrders] = useStoreState("admin", "orders");
  const [categories, setCategories] = useStoreState("admin", "categories");
  const [promotions, setPromotions] = useStoreState("admin", "promotions");
  const [customers, setCustomers] = useStoreState("admin", "customers");
  const [reservations, setReservations] = useStoreState("admin", "reservations");
  const [venueTables, setVenueTables] = useStoreState("admin", "venueTables");
  const [loading, setLoading] = useStoreState("admin", "loading");
  const [liveUsers] = useStoreState("admin", "liveUsers");
  const [live] = useStoreState("admin", "live");
  const [busy, setBusy] = useStoreState("admin", "busy");
  const knownIds = useRef(null);
  // Yangi buyurtmalarni aniqlash: tepadan bildirishnoma + tovush
  useEffect(() => {
    if (loading) return;
    if (knownIds.current === null) {
      // Wait for the first successful server snapshot.
      return;
    }
    const fresh = orders.filter((o) => !knownIds.current.has(o.id));
    orders.forEach((o) => knownIds.current.add(o.id));
    if (fresh.length === 0) return;
    if (settings.sound && settings.volume > 0) {
      if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
        const message = new SpeechSynthesisUtterance(
          fresh.length === 1 ? "Yangi buyurtma keldi" : fresh.length + " ta yangi buyurtma keldi",
        );
        message.lang = "uz-UZ";
        message.volume = Math.min(1, settings.volume / 100);
        message.onerror = () => playOrderSound(settings.volume);
        window.speechSynthesis.speak(message);
      } else playOrderSound(settings.volume);
    }
    if (!settings.notifications) return;
    fresh.forEach((o) => {
      toast.success(` Yangi buyurtma: ${o.id}`, {
        position: "bottom-right",
        action: {
          label: "Ko‘rish",
          onClick: () => {
            window.location.href = "/admin/orders?order=" + encodeURIComponent(o.id);
          },
        },
        duration: settings.notificationDuration * 1000,
        description: `${o.userName ?? "Mijoz"} · ${fmtSum(o.total)}`,
      });
    });
  }, [orders, loading, settings]);
  useEffect(() => {
    window.addEventListener("pointerdown", unlockSound);
    window.addEventListener("keydown", unlockSound);
    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);
  const refresh = useCallback(async () => {
    const c = getCreds();
    if (!c) return setLoading(false);
    try {
      const d = await getAdminData({ data: c });
      setCategories(d.categories ?? []);
      setProducts(d.products);
      if (knownIds.current === null) knownIds.current = new Set(d.orders.map((o) => o.id));
      setOrders(d.orders);
      setPromotions(d.promotions);
      setCustomers(d.customers);
      setReservations(d.reservations ?? []);
      setVenueTables(d.venueTables ?? []);
    } catch (e) {
      console.error(e);
      if (/sessiya|tizimga kiring/i.test(e.message || "")) {
        localStorage.removeItem(AUTH_KEY);
        toast.error("Sessiya tugagan, qayta kiring");
        setTimeout(() => window.location.reload(), 1200);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const c = getCreds();
    if (!c) return setLoading(false);
    void refresh();

    const onChange = () => void refresh();
    window.addEventListener("xonqa-db", onChange);
    window.addEventListener("storage", onChange);
    // Real vaqt: boshqa qurilmadan kelgan buyurtmalarni har 4 soniyada tekshirish
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("xonqa-db", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);
  const run = useCallback(
    async (fn) => {
      const c = getCreds();
      if (!c) {
        toast.error("Avval tizimga kiring");
        return false;
      }
      setBusy((b) => b + 1);
      try {
        await fn(c);
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Saqlab bo'lmadi");
        if (/sessiya|tizimga kiring/i.test(e.message || "")) {
          localStorage.removeItem(AUTH_KEY);
          setBusy((b) => b - 1);
          setTimeout(() => window.location.reload(), 1200);
          return false;
        }
        await refresh();
        setBusy((b) => b - 1);
        return false;
      }
      await refresh();
      setBusy((b) => b - 1);
      return true;
    },
    [refresh],
  );
  const value = useMemo(
    () => ({
      categories,
      categoryLabel: (id) => {
        const c = categories.find((x) => x.id === id);
        return c ? c.name : id;
      },
      saveCategory: (category) => run((c) => saveCategory({ data: { ...c, category } })),
      deleteCategory: (id) => run((c) => removeCategory({ data: { ...c, id } })),
      products,
      orders,
      newOrdersCount: orders.filter((o) => o.status === "new").length,
      promotions,
      customers,
      reservations,
      venueTables,
      saveVenueTable: (table) => run((c) => saveVenueTable({ data: { ...c, table } })),
      deleteVenueTable: (id) => run((c) => deleteVenueTable({ data: { ...c, id } })),
      newReservationsCount: reservations.filter((r) => r.status === "new").length,
      setReservationStatus: (id, status) => {
        setReservations((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
        void run((c) => updateReservationStatus({ data: { ...c, id, status } }));
      },
      loading,
      busy: busy > 0,
      reorderCategories: (ids) => {
        setCategories((l) => ids.map((id, i) => ({ ...l.find((x) => x.id === id), sort: i })));
        return run((c) => reorderCategories({ data: { ...c, ids } }));
      },
      liveUsers,
      live,
      refresh,
      addProduct: async (p) => {
        const product = { ...p, id: `custom_${Date.now()}` };
        setProducts((l) => [...l, product]);
        const ok = await run((c) => saveProduct({ data: { ...c, product } }));
        if (!ok) setProducts((l) => l.filter((x) => x.id !== product.id));
        return ok;
      },
      updateProduct: async (id, patch) => {
        const cur = products.find((p) => p.id === id);
        if (!cur) return false;
        const product = { ...cur, ...patch, id };
        setProducts((l) => l.map((p) => (p.id === id ? product : p)));
        const ok = await run((c) => saveProduct({ data: { ...c, product } }));
        if (!ok) setProducts((l) => l.map((p) => (p.id === id ? cur : p)));
        return ok;
      },
      deleteProduct: (id) => {
        setProducts((l) => l.filter((p) => p.id !== id));
        void run((c) => removeProduct({ data: { ...c, id } }));
      },
      setOrderStatus: (id, status, reason) => {
        setOrders((l) =>
          l.map((o) =>
            o.id === id ? { ...o, status, ...(reason ? { cancelReason: reason } : {}) } : o,
          ),
        );
        void run((c) => updateOrderStatus({ data: { ...c, id, status, reason } }));
      },
      addPromotion: async (p) => {
        const promotion = { ...p, id: `promo_${Date.now()}` };
        setPromotions((l) => [...l, promotion]);
        const ok = await run((c) => savePromotion({ data: { ...c, promotion } }));
        if (!ok) setPromotions((l) => l.filter((x) => x.id !== promotion.id));
        return ok;
      },
      updatePromotion: async (id, patch) => {
        const cur = promotions.find((p) => p.id === id);
        if (!cur) return false;
        const promotion = { ...cur, ...patch, id };
        setPromotions((l) => l.map((p) => (p.id === id ? promotion : p)));
        const ok = await run((c) => savePromotion({ data: { ...c, promotion } }));
        if (!ok) setPromotions((l) => l.map((p) => (p.id === id ? cur : p)));
        return ok;
      },
      deletePromotion: (id) => {
        setPromotions((l) => l.filter((p) => p.id !== id));
        void run((c) => removePromotion({ data: { ...c, id } }));
      },
    }),
    [
      categories,
      products,
      orders,
      promotions,
      customers,
      reservations,
      venueTables,
      loading,
      busy,
      live,
      refresh,
      run,
    ],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
function useAdminStore() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminStore must be used inside AdminStoreProvider");
  return ctx;
}
export { AUTH_KEY, AdminStoreProvider, getCreds, useAdminStore };
