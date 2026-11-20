import CustomerNotifications from "@/components/site/CustomerNotifications";
import RealtimeBridge from "@/components/site/RealtimeBridge";
import { useEffect } from "react";
import { SiteSettingsProvider } from "@/components/site/site-settings";
import { Routes, Route, Outlet, Link, useLocation } from "react-router-dom";
import ProductDetail from "@/pages/ProductDetail";
import SitePromotionDetail from "@/pages/PromotionDetail";
import SiteApp from "@/pages/Home";
import Account from "@/pages/Account";
import OrderHistory from "@/pages/OrderHistory";
import { SettingsProvider } from "@/admin/store/settings-store";
import { Toaster } from "@/components/ui/sonner";
import AdminLayout from "@/admin/components/AdminLayout";
import Login from "@/admin/pages/Login";
import Dashboard from "@/admin/pages/Dashboard";
import Orders from "@/admin/pages/Orders";
import Products from "@/admin/pages/Products";
import Categories from "@/admin/pages/Categories";
import Customers from "@/admin/pages/Customers";
import Promotions from "@/admin/pages/Promotions";
import PromotionDetail from "@/admin/pages/PromotionDetail";
import Settings from "@/admin/pages/Settings";
import Stats from "@/admin/pages/Stats";
import Reservations from "@/admin/pages/Reservations";
import Booking from "@/pages/Booking";

function AdminRoot() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Xonqa O'rinboy Hotdog — Admin";
    return () => {
      document.title = prev;
    };
  }, []);
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Sahifa topilmadi</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Bosh sahifa
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <SettingsProvider>
      <SiteSettingsProvider>
        <Toaster />
        <ScrollReset />
        <RealtimeBridge />
        <CustomerNotifications />
        <Routes>
          <Route path="/" element={<SiteApp />} />
          <Route path="/mahsulot/:id" element={<ProductDetail />} />
          <Route path="/buyurtmalar" element={<OrderHistory />} />
          <Route path="/profil" element={<Account />} />
          <Route path="/profil/login" element={<Account />} />
          <Route path="/profil/register" element={<Account />} />
          <Route path="/profil/registar" element={<Account />} />
          <Route path="/stol-band-qilish" element={<Booking />} />
          <Route path="/aksiya/:id" element={<SitePromotionDetail />} />
          <Route path="/admin" element={<AdminRoot />}>
            <Route path="login" element={<Login />} />
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="customers" element={<Customers />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="promotions/:id" element={<PromotionDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="stats" element={<Stats />} />
              <Route path="reservations" element={<Reservations />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SiteSettingsProvider>
    </SettingsProvider>
  );
}
