// Client-side wrappers around the Lovable Cloud server functions in db.functions.ts.
import {
  getPublicMenu,
  getPublicCard,
  getPublicPromotions,
  placeOrder,
  adminLoginFn,
  adminLogoutFn,
  getAdminDataFn,
  saveItemFn,
  removeItemFn,
  reorderCategoriesFn,
  updateOrderStatusFn,
  getWorkHoursFn,
  saveWorkHoursFn,
  getShopSettingsFn,
  saveShopSettingsFn,
  saveAdminCredsFn,
  getReceiptFn,
  createReservationFn,
  updateReservationStatusFn,
  getAvailableVenueTablesFn,
  saveVenueTableFn,
  deleteVenueTableFn,
} from "./db.functions";

const AUTH = "eb-admin-auth";

function storedCreds() {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(localStorage.getItem(AUTH) ?? "null");
    return v && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
const token = () => storedCreds()?.token ?? "";
const notify = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("xonqa-db"));
  try {
    localStorage.setItem("xonqa-db-changed", `${Date.now()}-${Math.random()}`);
  } catch {
    /* optional cross-tab refresh */
  }
};
const mutate = async (p) => {
  const r = await p;
  notify();
  return r;
};

const adminLogin = ({ data }) =>
  adminLoginFn({ data: { login: data?.login, password: data?.password } });
const adminLogout = () => adminLogoutFn({ data: { token: token() } }).catch(() => null);
const getAdminData = ({ data }: { data?: Record<string, any> } = {}) =>
  getAdminDataFn({ data: { token: data?.token ?? token() } });
const saveProduct = ({ data }) =>
  saveItemFn({ data: { token: data.token, kind: "product", item: data.product } });
const saveCategory = ({ data }) =>
  saveItemFn({ data: { token: data.token, kind: "category", item: data.category } });
const savePromotion = ({ data }) =>
  mutate(saveItemFn({ data: { token: data.token, kind: "promotion", item: data.promotion } }));
const removeProduct = ({ data }) =>
  removeItemFn({ data: { token: data.token, kind: "product", id: data.id } });
const removeCategory = ({ data }) =>
  removeItemFn({ data: { token: data.token, kind: "category", id: data.id } });
const removePromotion = ({ data }) =>
  mutate(removeItemFn({ data: { token: data.token, kind: "promotion", id: data.id } }));
const reorderCategories = ({ data }) =>
  reorderCategoriesFn({ data: { token: data.token, ids: data.ids } });
const updateOrderStatus = ({ data }) =>
  updateOrderStatusFn({
    data: { token: data.token, id: data.id, status: data.status, reason: data.reason },
  });
// Fetch the receipt file by order id when it is opened.
const fetchReceipt = async ({
  id,
  dataUrl,
  token: t,
  kind = "order",
}: {
  id: string;
  dataUrl?: string;
  token?: string;
  kind?: "reservation" | "order";
}) => {
  let src = dataUrl;
  if (!src) src = (await getReceiptFn({ data: { token: t ?? token(), id, kind } }))?.dataUrl;
  if (!src) throw new Error("Chek mavjud emas.");
  const response = await fetch(src);
  if (!response.ok) throw new Error("Chekni yuklab bo‘lmadi.");
  return response.blob();
};
const updateReservationStatus = ({ data }) =>
  updateReservationStatusFn({ data: { token: data.token, id: data.id, status: data.status } });
const getAvailableVenueTables = (data) => getAvailableVenueTablesFn({ data });
const saveVenueTable = ({ data }) =>
  mutate(saveVenueTableFn({ data: { token: data.token, table: data.table } }));
const deleteVenueTable = ({ data }) =>
  mutate(deleteVenueTableFn({ data: { token: data.token, id: data.id } }));
/** Public site: book a table in advance. Returns { id }. */
export const createReservation = (data) => mutate(createReservationFn({ data }));
const getWorkHours = () => getWorkHoursFn();
const saveWorkHours = async (hours) => {
  const result = await mutate(saveWorkHoursFn({ data: { token: token(), hours } }));
  window.dispatchEvent(new CustomEvent("xonqa-hours", { detail: { ...hours } }));
  return result;
};
const getShopSettings = () => getShopSettingsFn({ data: { token: token() } });
const saveShopSettings = (x) => mutate(saveShopSettingsFn({ data: { token: token(), ...x } }));
const saveAdminCreds = (x) => saveAdminCredsFn({ data: { token: token(), ...x } });

/** Public site: load the menu from the database. */
export const loadMenu = async () => {
  const menu = await getPublicMenu();
  if (!menu || !Array.isArray(menu.products)) throw new Error("Menyu javobi noto‘g‘ri");
  if (!Array.isArray(menu.promotions)) {
    try {
      menu.promotions = await getPublicPromotions();
    } catch {
      menu.promotions = [];
    }
  }
  return menu;
};

/** Public site: place an order. Returns { id }. */
export const createOrder = (data) => mutate(placeOrder({ data }));

export {
  saveAdminCreds,
  saveCategory,
  reorderCategories,
  removeCategory,
  adminLogout,
  getShopSettings,
  saveShopSettings,
  fetchReceipt,
  storedCreds,
  getWorkHours,
  saveWorkHours,
  updateReservationStatus,
  getAvailableVenueTables,
  saveVenueTable,
  deleteVenueTable,
  adminLogin,
  getAdminData,
  removeProduct,
  removePromotion,
  saveProduct,
  savePromotion,
  updateOrderStatus,
};

export const loadCard = () => getPublicCard();
