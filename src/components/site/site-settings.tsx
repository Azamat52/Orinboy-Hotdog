import { useStoreState } from "@/store";
import { createContext, useContext, useEffect, type PropsWithChildren } from "react";
import { toast } from "sonner";
import { getWorkHours } from "@/admin/lib/admin.functions";
import { shoppingNotice, workHoursLabel, workHoursStatus } from "@/admin/lib/work-hours";
import SiteLoader from "./SiteLoader";
import type { WorkHours } from "@/store";

interface SiteSettingsValue {
  hours: WorkHours | null;
  error: boolean;
  status: ReturnType<typeof workHoursStatus>;
  allowShopping: () => boolean;
}
const SiteSettingsContext = createContext<SiteSettingsValue | null>(null);
export function SiteSettingsProvider({ children }: PropsWithChildren) {
  const [hours, setHours] = useStoreState("site", "hours");
  const [error, setError] = useStoreState("site", "error");
  const [now, setNow] = useStoreState("site", "now");
  useEffect(() => {
    let alive = true,
      revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const data = await getWorkHours();
        if (!workHoursStatus(data?.workHours)) throw new Error("Invalid hours");
        if (alive && request === revision) {
          setHours(data.workHours);
          setError(false);
        }
      } catch {
        if (alive && request === revision) setError(true);
      }
    };
    const changed = (event) => {
      if (workHoursStatus(event.detail)) {
        ++revision;
        setHours(event.detail);
        setError(false);
      } else refresh();
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const poll = setInterval(visible, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("xonqa-hours", changed);
    window.addEventListener("xonqa-db", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("xonqa-hours", changed);
      window.removeEventListener("xonqa-db", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  const allowShopping = () => {
    if (!hours && !error) {
      toast(<SiteLoader compact />);
      return false;
    }
    const notice = shoppingNotice(error ? null : hours, Date.now());
    if (notice) {
      toast.warning(notice, { duration: 5000 });
      return false;
    }
    return true;
  };
  return (
    <SiteSettingsContext.Provider
      value={{ hours, error, status: workHoursStatus(hours, now), allowShopping }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}
export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) throw new Error("SiteSettingsProvider is required");
  return context;
}
export function SiteHours() {
  const { hours, error, status } = useSiteSettings();
  if (!hours) return error ? <span>Ish vaqti hali sozlanmagan</span> : <SiteLoader compact />;
  return (
    <>
      <span>{workHoursLabel(hours)}</span>
      <br />
      <small>{status?.open ? "Hozir ochiq" : "Hozir yopiq"} · Toshkent vaqti</small>
    </>
  );
}
