import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@/admin/router-shim";
import { adminLogin } from "@/admin/lib/admin.functions";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import "./admin-login.css";

function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Admin kirish — Xonqa O‘rinboy Hotdog";
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!login.trim() || !password) {
      setError("Login va parolni kiriting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await adminLogin({ data: { login: login.trim(), password } });
      if (result.ok && result.token) {
        localStorage.setItem("eb-admin-auth", JSON.stringify({ token: result.token }));
        navigate("/", { replace: true });
      } else {
        setError("Login yoki parol noto‘g‘ri. Ma’lumotlarni tekshirib qayta urinib ko‘ring.");
      }
    } catch {
      setError("Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib qayta urinib ko‘ring.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="xonqa-admin-auth">
      <div className="xonqa-admin-auth__body">
        <header className="xonqa-admin-auth__intro">
          <img
            className="xonqa-admin-auth__logo"
            src="/orinboy-madir-logo.jpeg"
            alt="O‘rinboy Hotdog Madir logotipi"
          />
          <span className="xonqa-admin-auth__brand">XONQA O‘RINBOY HOTDOG</span>
          <span className="xonqa-admin-auth__eyebrow">
            <ShieldCheck size={14} aria-hidden="true" /> ADMIN PANEL
          </span>
          <h1> Xush kelibsiz </h1>
          <p>Boshqaruv paneliga kirish</p>
        </header>
        <form className="xonqa-admin-auth__card" onSubmit={submit} noValidate>
          {error && (
            <div className="xonqa-admin-auth__error" role="alert">
              <AlertCircle size={19} aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} aria-label="Xabarni yopish">
                ×
              </button>
            </div>
          )}
          <label htmlFor="admin-login-name">Login</label>
          <div className="xonqa-admin-auth__field">
            <UserRound size={19} aria-hidden="true" />
            <input
              id="admin-login-name"
              type="text"
              placeholder="Loginingizni kiriting"
              autoComplete="username"
              value={login}
              onChange={(e) => {
                setLogin(e.target.value);
                if (error) setError("");
              }}
              required
              autoFocus
            />
          </div>
          <label htmlFor="admin-login-password">Parol</label>
          <div className="xonqa-admin-auth__field">
            <LockKeyhole size={19} aria-hidden="true" />
            <input
              id="admin-login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Parolingizni kiriting"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              required
            />
            <button
              className="xonqa-admin-auth__eye"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className="xonqa-admin-auth__submit" type="submit" disabled={submitting}>
            {submitting ? (
              <LoaderCircle className="xonqa-admin-auth__spin" size={20} aria-hidden="true" />
            ) : (
              <LogIn size={19} aria-hidden="true" />
            )}
            {submitting ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default LoginPage;
