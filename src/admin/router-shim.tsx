// Small adapter so the admin pages keep their relative "/orders" style paths under /admin.
import {
  Link as RLink,
  Outlet as ROutlet,
  useNavigate as useRNavigate,
  useLocation as useRLocation,
  useParams as useRParams,
} from "react-router-dom";

const BASE = "/admin";
export const toAdmin = (to) => (to === "/" ? BASE : to.startsWith(BASE) ? to : BASE + to);
const fromAdmin = (p) => (p.startsWith(BASE) ? p.slice(BASE.length) || "/" : p);

export function Link({ to, ...props }) {
  return <RLink to={toAdmin(to)} {...props} />;
}

export function NavLink({ to, end, className, children, ...props }) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <RLink
      to={toAdmin(to)}
      className={typeof className === "function" ? className({ isActive }) : className}
      {...props}
    >
      {children}
    </RLink>
  );
}

export function useNavigate() {
  const nav = useRNavigate();
  return (to, opts?: { replace?: boolean }) => nav(toAdmin(to), { replace: opts?.replace });
}

export function useLocation() {
  const loc = useRLocation();
  return { ...loc, pathname: fromAdmin(loc.pathname) };
}

export const useParams = () => useRParams();
export const Outlet = ROutlet;
