// Client callers for the "api" edge function (server logic lives there now).
import { supabase } from "@/integrations/supabase/client";
const call =
  (fn: string) =>
  async ({ data }: { data?: Record<string, any> } = {}) => {
    const { data: res, error } = await supabase.functions.invoke("api", { body: { fn, data } });
    if (error) {
      let msg = error.message;
      try {
        const body = await error.context?.json?.();
        if (body?.error) msg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    if (res?.error) throw new Error(res.error);
    return res?.result;
  };
export const getPublicMenu = call("getPublicMenu");
export const getPublicCard = call("getPublicCard");
export const getPublicPromotions = call("getPublicPromotions");
export const placeOrder = call("placeOrder");
export const getReceiptFn = call("getReceiptFn");
export const adminLoginFn = call("adminLoginFn");
export const adminLogoutFn = call("adminLogoutFn");
export const getAdminDataFn = call("getAdminDataFn");
export const saveItemFn = call("saveItemFn");
export const removeItemFn = call("removeItemFn");
export const reorderCategoriesFn = call("reorderCategoriesFn");
export const updateOrderStatusFn = call("updateOrderStatusFn");
export const getWorkHoursFn = call("getWorkHoursFn");
export const saveWorkHoursFn = call("saveWorkHoursFn");
export const getShopSettingsFn = call("getShopSettingsFn");
export const saveShopSettingsFn = call("saveShopSettingsFn");
export const saveAdminCredsFn = call("saveAdminCredsFn");
export const getMyOrderStatusFn = call("getMyOrderStatusFn");
export const cancelMyOrderFn = call("cancelMyOrderFn");
export const createReservationFn = call("createReservation");
export const updateReservationStatusFn = call("updateReservationStatus");
export const getAvailableVenueTablesFn = call("getAvailableVenueTables");
export const saveVenueTableFn = call("saveVenueTable");
export const deleteVenueTableFn = call("deleteVenueTable");
export const customerStatusFeed = call("customerStatusFeed");
