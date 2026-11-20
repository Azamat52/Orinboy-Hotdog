import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Current signed-in customer (null when signed out, undefined while loading). */
export function useCustomer() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, values) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, ...values, updated_at: new Date().toISOString() });
  if (error) throw error;
  applyAppearance(values);
}

/** Apply saved appearance preferences to the storefront. */
export function applyAppearance(p) {
  if (typeof document === "undefined" || !p?.font_size) return;

  document.documentElement.dataset.siteFont = p.font_size || "normal";
}

export async function loadCart(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, qty")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.product_id, qty: r.qty }));
}

/** Replace the user's stored cart with the given rows. */
export async function saveCart(userId, cart) {
  const keep = cart.map((i) => i.id);
  let del = supabase.from("cart_items").delete().eq("user_id", userId);
  if (keep.length)
    del = del.not("product_id", "in", `(${keep.map((k) => `"${k.replace(/"/g, "")}"`).join(",")})`);
  const { error: e1 } = await del;
  if (e1) throw e1;
  if (cart.length) {
    const { error } = await supabase.from("cart_items").upsert(
      cart.map((i) => ({
        user_id: userId,
        product_id: i.id,
        qty: i.qty,
        updated_at: new Date().toISOString(),
      })),
    );
    if (error) throw error;
  }
}
