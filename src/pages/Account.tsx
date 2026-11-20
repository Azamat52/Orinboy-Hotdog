import LocateAddress, { type DeliveryPoint } from "@/components/site/LocateAddress";
import {
  MapPin,
  ArrowLeft,
  CalendarDays,
  History,
  LogOut,
  Palette,
  Save,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { safeReturnPath } from "@/lib/customer-login";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  LockKeyhole,
  UserRound,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, loadProfile, saveProfile } from "@/lib/customer";
import { useSettings } from "@/admin/store/settings-store";
import SiteLoader from "@/components/site/SiteLoader";
import "../styles/site.css";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Ism juda uzun"),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^\+?[0-9 ()-]{7,20}$/.test(v), "Telefon raqam noto‘g‘ri"),
  birthday: z
    .string()
    .refine(
      (d) => !d || (d > "1900-01-01" && d <= new Date().toISOString().slice(0, 10)),
      "Tug‘ilgan kun noto‘g‘ri",
    ),
  theme: z.enum(["dark", "light", "system"]),
  font_size: z.enum(["small", "normal", "large"]),
});

const uzErr = (message = "", status?: number, code?: string) => {
  const c = String(code || "").toLowerCase();
  if (c === "email_address_invalid" || c === "email_address_not_authorized")
    return "Email manzilingizni tekshiring. Bu email manzili Supabase tomonidan qabul qilinmadi.";
  if (c === "signup_disabled") return "Ro‘yxatdan o‘tish Supabase Auth sozlamalarida o‘chirilgan.";
  if (c === "user_already_exists" || c === "email_exists")
    return "Bu email avval ro‘yxatdan o‘tgan. Kirish tabini tanlang.";
  if (c === "weak_password")
    return "Parol talabga javob bermadi. Kamida 6 ta belgi va murakkabroq parol kiriting.";
  if (c === "captcha_failed")
    return "CAPTCHA tekshiruvi muvaffaqiyatsiz. Administrator CAPTCHA sozlamalarini tekshirishi kerak.";
  if (c === "unexpected_failure" || c === "database_error")
    return "Supabase Auth ichki yoki database xatosi. Dashboard → Logs → Auth bo‘limini tekshiring.";
  const m = String(message || "").toLowerCase();
  if (status === 429 || m.includes("rate limit") || m.includes("too many"))
    return "Juda ko‘p urinish bo‘ldi. Birozdan keyin qayta urinib ko‘ring.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "Ro‘yxatdan o‘tish server sozlamalarida o‘chirilgan.";
  if (m.includes("email") && m.includes("invalid")) return "Email manzilini tekshiring.";
  if (m.includes("email address not authorized") || m.includes("email not allowed"))
    return "Bu email bilan ro‘yxatdan o‘tishga ruxsat yo‘q.";
  if (m.includes("database error saving new user") || m.includes("database error"))
    return "Server yangi hisobni saqlay olmadi. Supabase Auth jadvallari va triggerlarini tekshiring.";
  if (m.includes("relation") || m.includes("does not exist") || m.includes("schema cache"))
    return "Serverda kerakli profil jadvali topilmadi.";
  if (m.includes("permission") || m.includes("row-level"))
    return "Ruxsat xatosi. Sayt administratoriga xabar bering.";
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Email yoki parol noto‘g‘ri.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Bu email avval ro‘yxatdan o‘tgan. Kirish oynasini tanlang.";
  if (m.includes("not confirmed") || m.includes("email not confirmed"))
    return "Hisobni faollashtirish uchun emailingizga kelgan tasdiqlash havolasini oching.";
  if (m.includes("password")) return "Parol kamida 6 ta belgidan iborat bo‘lishi kerak.";
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch"))
    return "Serverga ulanib bo‘lmadi. Internet va Supabase sozlamalarini tekshiring.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google orqali kirish serverda yoqilmagan.";
  return status === 400
    ? `Ro‘yxatdan o‘tish so‘rovi rad etildi (HTTP 400${code ? `, ${code}` : ""}). Supabase Auth sozlamalari yoki email/parol talablarini tekshiring.`
    : status
      ? `So‘rov bajarilmadi (HTTP ${status}${code ? `, ${code}` : ""}). Qayta urinib ko‘ring.`
      : "So‘rov bajarilmadi. Tarmoqni tekshiring yoki sayt administratoriga murojaat qiling.";
};

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.has("next") ? safeReturnPath(params.get("next")) : "/";
  const reason = params.get("reason");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const switchTab = (tab: "login" | "signup") => {
    if (tab === mode) return;
    setMsg("");
    setSuccess("");
    setShow(false);
    nav(`${tab === "login" ? "/profil/login" : "/profil/registar"}${suffix}`);
  };
  const google = async () => {
    setMsg("");
    setSuccess("");
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profil/login?${new URLSearchParams({ next, ...(reason ? { reason } : {}) }).toString()}`,
        },
      });
      if (error) {
        console.error("Google auth:", error);
        setMsg(uzErr(error.message, error.status, error.code));
      }
    } catch (err: any) {
      console.error("Google auth:", err);
      setMsg(uzErr(err?.message, err?.status, err?.code));
    } finally {
      setGoogleBusy(false);
    }
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(f.get("password") || "");
    const phone = String(f.get("phone") || "").trim();
    const fullName = String(f.get("fullName") || "").trim();
    setMsg("");
    setSuccess("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setMsg("To‘g‘ri email manzilini kiriting.");
    if (password.length < 6) return setMsg("Parol kamida 6 ta belgidan iborat bo‘lsin.");
    if (mode === "signup" && !fullName) return setMsg("Iltimos, ismingizni kiriting.");
    if (mode === "signup" && phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone))
      return setMsg("Telefon raqami noto‘g‘ri.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone },
            emailRedirectTo: `${window.location.origin}/profil/login?${new URLSearchParams({ next }).toString()}`,
          },
        });
        if (error) {
          console.error("Signup error:", error);
          setMsg(uzErr(error.message, error.status, error.code));
          return;
        }
        if (!data.session) {
          // Supabase email-confirmation is enabled. Do NOT try a password sign-in yet.
          setSuccess(
            "Hisob yaratish so‘rovi qabul qilindi. Agar email tasdiqlash yoqilgan bo‘lsa, emailingizdagi havolani bosing. Keyin Kirish bo‘limiga o‘ting.",
          );
          return;
        }
        if (data.user) {
          // Profile data is optional; a profile RLS failure must not turn a successful signup into an error.
          try {
            await saveProfile(data.user.id, { full_name: fullName, ...(phone ? { phone } : {}) });
          } catch (profileError) {
            console.warn("Optional profile save failed:", profileError);
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Sign-in error:", error);
          setMsg(uzErr(error.message, error.status, error.code));
          return;
        }
      }
      nav(next, { replace: true });
    } catch (err: any) {
      console.error("Authentication request failed:", err);
      setMsg(uzErr(err?.message, err?.status, err?.code));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-shell" aria-labelledby="auth-heading">
      <div className="auth-intro">
        <img
          className="auth-site-logo"
          src="/orinboy-madir-logo.jpeg"
          alt="O‘rinboy Hotdog Madir logotipi"
          width="74"
          height="74"
        />
        <span className="auth-brand-name">O‘RINBOY HOTDOG</span>
        <h1 id="auth-heading">{mode === "login" ? "Xush kelibsiz" : "Hisob yaratish"}</h1>
        <p>
          {mode === "login"
            ? "Hisobingizga kirib buyurtmani davom ettiring"
            : "Boshlash uchun ro‘yxatdan o‘ting"}
        </p>
      </div>
      <form className="account-card auth-card auth-modern" onSubmit={submit} key={mode} noValidate>
        <div
          role="tablist"
          aria-label="Hisobga kirish yoki ro‘yxatdan o‘tish"
          className="auth-tabs auth-switch"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => switchTab("login")}
          >
            Kirish
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchTab("signup")}
          >
            Ro‘yxatdan o‘tish
          </button>
        </div>
        {reason === "cart" && (
          <div className="auth-required-notice" role="status">
            <AlertCircle size={18} /> Savatdan foydalanish uchun avval hisobingizga kiring yoki
            ro‘yxatdan o‘ting.
          </div>
        )}
        {msg && (
          <div className="auth-feedback error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <span>{msg}</span>
            <button type="button" aria-label="Xabarni yopish" onClick={() => setMsg("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {success && (
          <div className="auth-feedback success" role="status">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
        <button
          type="button"
          className="auth-google"
          onClick={google}
          disabled={busy || googleBusy}
        >
          {googleBusy ? (
            <Loader2 className="auth-spin" size={20} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
          )}
          Google bilan davom etish
        </button>
        <div className="auth-or">
          <span>YOKI</span>
        </div>
        {mode === "signup" && (
          <label>
            To‘liq ism
            <span className="auth-field">
              <UserRound size={19} />
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Ism Familiya"
                maxLength={100}
                required
              />
            </span>
          </label>
        )}
        {mode === "signup" && (
          <label>
            Telefon raqam <small>(ixtiyoriy)</small>
            <span className="auth-field">
              <Phone size={19} />
              <input name="phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" />
            </span>
          </label>
        )}
        <label>
          Email
          <span className="auth-field">
            <Mail size={19} />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label>
          Parol
          <span className="auth-field auth-pass">
            <LockKeyhole size={19} />
            <input
              name="password"
              type={show ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Kamida 6 ta belgi"
            />
            <button
              type="button"
              aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
        </label>
        <button className="account-btn auth-submit" type="submit" disabled={busy || googleBusy}>
          {busy ? <Loader2 size={19} className="auth-spin" /> : null}
          <span>
            {busy ? "Tekshirilmoqda..." : mode === "login" ? "Kirish" : "Ro‘yxatdan o‘tish"}
          </span>
          {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </button>
      </form>
    </section>
  );
}

function ProfileForm({ user, onLeaving }) {
  const { settings, updateSettings } = useSettings();
  const nav = useNavigate();
  const [point, setPoint] = useState<DeliveryPoint | null>(
    user.user_metadata?.delivery_point || null,
  );
  const [address, setAddress] = useState(String(user.user_metadata?.delivery_address || ""));
  const [pending, setPending] = useState("");
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let active = true;
    const defaults = {
      full_name: user.user_metadata?.full_name || "",
      phone: user.user_metadata?.phone || "",
      birthday: "",
      font_size: "normal",
    };
    loadProfile(user.id)
      .then((row) => {
        if (active)
          setP({
            ...defaults,
            ...row,
            full_name: row?.full_name ?? defaults.full_name,
            phone: row ? row.phone || "" : defaults.phone,
          });
      })
      .catch((error) => {
        if (active) {
          setP(defaults);
          setMsg(uzErr(error.message, error.status));
        }
      });
    return () => {
      active = false;
    };
  }, [user.id]);
  if (!p) return <SiteLoader />;
  const submit = async (e) => {
    e.preventDefault();
    const r = profileSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return setMsg(r.error.issues[0].message);
    try {
      setPending("save");
      const { theme, ...values } = r.data;
      await saveProfile(user.id, {
        ...values,
        birthday: values.birthday || null,
        phone: values.phone || null,
      });

      if (
        address.trim() !== (user.user_metadata?.delivery_address || "") ||
        point?.lat !== user.user_metadata?.delivery_point?.lat ||
        point?.lng !== user.user_metadata?.delivery_point?.lng
      ) {
        const { error } = await supabase.auth.updateUser({
          data: { delivery_address: address.trim(), delivery_point: point },
        });
        if (error) throw error;
      }
      setMsg("Profil saqlandi.");
    } catch (err) {
      setMsg(uzErr(err?.message, err?.status, err?.code));
    } finally {
      setPending("");
    }
  };
  const logout = async () => {
    setPending("logout");
    onLeaving(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      nav("/", { replace: true });
    } catch (error) {
      onLeaving(false);
      setMsg(uzErr(error.message));
      setPending("");
    }
  };
  return (
    <section className="settings-page">
      <h1>Profil sozlamalari</h1>
      <form className="auth-modern" onSubmit={submit}>
        <fieldset className="settings-panel" disabled={Boolean(pending)}>
          <legend>Profilni tahrirlash</legend>
          <label>
            Ism
            <span className="auth-field">
              <UserRound size={19} />
              <input
                name="full_name"
                defaultValue={p.full_name ?? ""}
                autoComplete="name"
                maxLength={100}
              />
            </span>
          </label>
          <label>
            Telefon raqam
            <span className="auth-field">
              <Phone size={19} />
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={p.phone ?? ""}
                placeholder="+998 90 123 45 67"
              />
            </span>
          </label>
          <label>
            Tug‘ilgan kun
            <span className="auth-field">
              <CalendarDays size={19} />
              <input name="birthday" type="date" defaultValue={p.birthday ?? ""} />
            </span>
          </label>
          <label>
            Email
            <span className="auth-field">
              <Mail size={19} />
              <input type="email" readOnly value={user.email || ""} />
            </span>
          </label>
          <small>Email ushbu sahifada o‘zgartirilmaydi.</small>
        </fieldset>
        <fieldset className="settings-panel" disabled={Boolean(pending)}>
          <legend>Joylashuvlar</legend>
          <LocateAddress
            value={address}
            onFound={(found) => {
              setAddress(found.name);
              setPoint(found);
            }}
          />
          <label>
            Yetkazib berish manzili
            <span className="auth-field">
              <MapPin size={19} />
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setPoint(null);
                }}
                maxLength={250}
                autoComplete="street-address"
                placeholder="Mahalla, ko‘cha va uy raqami"
              />
            </span>
          </label>
          {!address.trim() && <small>Hozircha yetkazib berish manzili kiritilmagan.</small>}
        </fieldset>
        <fieldset className="settings-panel" disabled={Boolean(pending)}>
          <legend>Sayt ko‘rinishi</legend>
          <label>
            Mavzu
            <span className="auth-field">
              <Palette size={19} />
              <select
                name="theme"
                value={settings.theme}
                onChange={(e) =>
                  void updateSettings({ theme: e.target.value as typeof settings.theme }).catch(
                    () => {},
                  )
                }
              >
                <option value="dark">Qorong‘i</option>
                <option value="light">Yorug‘</option>
                <option value="system">Qurilmaga mos</option>
              </select>
            </span>
          </label>
          <label>
            Shrift o‘lchami
            <span className="auth-field">
              <Type size={19} />
              <select name="font_size" defaultValue={p.font_size}>
                <option value="small">Kichik</option>
                <option value="normal">O‘rtacha</option>
                <option value="large">Katta</option>
              </select>
            </span>
          </label>
        </fieldset>
        {msg && (
          <p role="status" className="account-msg">
            {msg}
          </p>
        )}
        <button disabled={Boolean(pending)} className="account-btn auth-submit">
          {pending === "save" ? <Loader2 className="animate-spin" /> : <Save size={18} />} Saqlash
        </button>
        <div className="settings-panel settings-links">
          <Link className="profile-action" to="/buyurtmalar">
            <History size={18} /> Buyurtmalar tarixi
          </Link>
          <Link className="profile-action" to="/stol-band-qilish">
            <CalendarDays size={18} /> Stol band qilish
          </Link>
          <Link className="profile-action" to="/admin">
            <UserRound size={18} /> Admin panel
          </Link>
          <button
            className="profile-action"
            type="button"
            disabled={Boolean(pending)}
            onClick={logout}
          >
            {pending === "logout" ? <Loader2 className="animate-spin" /> : <LogOut size={18} />}{" "}
            {pending === "logout" ? "Chiqilmoqda…" : "Chiqish"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Account() {
  const [leaving, setLeaving] = useState(false);
  const user = useCustomer();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "");
  const [params] = useSearchParams();
  const next = params.has("next") ? safeReturnPath(params.get("next")) : "/";
  const mode = path.endsWith("/login") ? "login" : "signup";
  useEffect(() => {
    const previous = document.title;
    document.title = "Profil — Xonqa Hotdog";
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    const isAuth = user === null;
    document.documentElement.classList.toggle("xonqa-auth-viewport", isAuth);
    document.body.classList.toggle("xonqa-auth-viewport", isAuth);
    return () => {
      document.documentElement.classList.remove("xonqa-auth-viewport");
      document.body.classList.remove("xonqa-auth-viewport");
    };
  }, [user]);
  // OAuth returns here with an active session; continue to the requested product/cart.
  useEffect(() => {
    if (user && params.has("next")) window.location.replace(next);
  }, [user, next, params]);
  if (leaving && user === null) return <Navigate to="/" replace />;
  if (path === "/profil" && user === null) return <Navigate to="/profil/registar" replace />;
  return (
    <div className={"xonqa-site account-page auth-page-v20"}>
      <div
        className="wrap auth-topbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          paddingTop: 14,
        }}
      >
        <Link to="/" className="back-btn">
          <ArrowLeft size={17} /> Bosh sahifa
        </Link>
      </div>
      <main className="wrap">
        {user === undefined ? (
          <SiteLoader />
        ) : user ? (
          <ProfileForm key={user.id} user={user} onLeaving={setLeaving} />
        ) : (
          <AuthForm mode={mode} />
        )}
      </main>
    </div>
  );
}
