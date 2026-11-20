import { useStoreState } from "@/store";
import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from "react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, normalizeSettings, type AdminSettings } from "@/admin/lib/preferences";
import { useCustomer, loadProfile, saveProfile } from "@/lib/customer";
import { supabase } from "@/integrations/supabase/client";
import { appearanceKey, applyTheme, resolveTheme } from "@/lib/appearance";

interface SettingsContextValue {
  settings: AdminSettings;
  updateSettings: (patch: Partial<AdminSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}
const SettingsContext = createContext<SettingsContextValue | null>(null);
export function SettingsProvider({ children }: PropsWithChildren) {
  const user = useCustomer();
  const userId = user?.id;
  const currentId = useRef(userId);
  currentId.current = userId;
  const [settings, setSettings] = useStoreState("settings", "settings");
  const revision = useRef(0);
  useEffect(() => {
    let alive = true;
    const request = ++revision.current;
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(appearanceKey(userId)) || "null");
    } catch {
      /* Optional browser feature or stored preference. */
    }
    const initial = normalizeSettings(cached);
    setSettings(initial);
    document.documentElement.dataset.siteFont = "normal";
    if (userId)
      loadProfile(userId)
        .then((profile) => {
          if (!alive || request !== revision.current) return;
          const theme = user.user_metadata?.appearance_theme || profile?.theme || initial.theme;
          setSettings(normalizeSettings({ ...initial, theme }));
          document.documentElement.dataset.siteFont = profile?.font_size || "normal";
        })
        .catch(() => {});
    const sync = (event) => {
      if (event.key === appearanceKey(userId)) {
        try {
          ++revision.current;
          setSettings(normalizeSettings(JSON.parse(event.newValue || "null")));
        } catch {
          /* Optional browser feature or stored preference. */
        }
      }
    };
    const profileSaved = (event) => {
      if (event.detail.userId === userId) {
        ++revision.current;
        setSettings((s) => normalizeSettings({ ...s, theme: event.detail.theme }));
      }
    };
    window.addEventListener("storage", sync);
    window.addEventListener("xonqa-appearance", profileSaved);
    return () => {
      alive = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("xonqa-appearance", profileSaved);
    };
  }, [userId]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      applyTheme(settings.theme, media.matches);
      document.documentElement.dataset.density = settings.compact ? "compact" : "comfortable";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings]);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const updateSettings = (patch: Partial<AdminSettings>): Promise<void> => {
    ++revision.current;
    setSettings((s) => {
      const next = normalizeSettings({ ...s, ...patch });
      try {
        localStorage.setItem(appearanceKey(userId), JSON.stringify(next));
      } catch {
        /* Optional browser feature or stored preference. */
      }
      return next;
    });
    if (!patch.theme || !userId) return Promise.resolve();
    const id = userId;
    const persist = async () => {
      if (currentId.current !== id) return;
      const { error } = await supabase.auth.updateUser({ data: { appearance_theme: patch.theme } });
      if (error) throw error;
      if (currentId.current !== id) return;
      // Existing profile schema accepts resolved dark/light only.
      await saveProfile(id, {
        theme: resolveTheme(patch.theme, window.matchMedia("(prefers-color-scheme: dark)").matches),
      });
    };
    const result = pending.current
      .catch(() => {})
      .then(persist)
      .catch((error) => {
        toast.error("Rang rejimini hisobingizga saqlab bo‘lmadi. Qayta urinib ko‘ring.");
        throw error;
      });
    pending.current = result;
    result.catch(() => {});
    return result;
  };
  const resetSettings = (): Promise<void> => updateSettings({ ...DEFAULT_SETTINGS });
  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings requires SettingsProvider");
  return context;
}
