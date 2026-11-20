import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/customer";
import { useAppDispatch } from "@/store";
import { patchAdmin } from "@/store/slices/adminSlice";

export default function RealtimeBridge() {
  const user = useCustomer();
  const admin = useLocation().pathname.startsWith("/admin");
  const dispatch = useAppDispatch();
  const customer = admin ? undefined : user?.id;
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("store-updates")
      .on("broadcast", { event: "changed" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => window.dispatchEvent(new Event("xonqa-db")), 180);
      })
      .subscribe();
    if (!admin && !customer)
      return () => {
        clearTimeout(timer);
        void supabase.removeChannel(channel);
      };
    const presence = supabase.channel("store-presence", {
      config: { presence: { enabled: true } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        if (!active) return;
        const rows = Object.values(presence.presenceState<{ customer?: string }>()).flat();
        dispatch(
          patchAdmin({ liveUsers: new Set(rows.map((row) => row.customer).filter(Boolean)).size }),
        );
      })
      .subscribe(async (status) => {
        if (!active) return;
        dispatch(patchAdmin({ live: status === "SUBSCRIBED" }));
        if (status === "SUBSCRIBED" && customer) {
          const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(customer));
          if (active)
            await presence.track({
              customer: Array.from(new Uint8Array(bytes), (byte) =>
                byte.toString(16).padStart(2, "0"),
              ).join(""),
            });
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
      void supabase.removeChannel(presence);
      void supabase.removeChannel(channel);
    };
  }, [customer, admin, dispatch]);
  return null;
}
