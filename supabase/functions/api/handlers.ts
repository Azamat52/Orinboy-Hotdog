import { createClient } from "npm:@supabase/supabase-js@2.119.0";
// Tiny stand-in so the original server-function code below stays unchanged.
const createServerFn = (_o?: unknown) => { const b: any = { inputValidator: () => b, handler: (fn: any) => fn }; return b; };
let _admin: any;

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function db() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server konfiguratsiyasi to‘liq emas");
  _admin ??= createClient(url, key, { auth: { persistSession: false } });
  const supabaseAdmin = _admin;
  return supabaseAdmin as Any;
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSetting(key: string, fallback: Any) {
  const { data } = await (await db()).from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}
async function setSetting(key: string, value: Any) {
  const { error } = await (await db()).from("app_settings").upsert({ key, value });
  if (error) throw new Error(error.message);
}

async function adminCreds() {
  const a = await getSetting("admin", null);
  if (a) return a;

  // Never ship a predictable admin/admin credential in production.
  // Set these as Supabase Edge Function secrets for the first login, then
  // change the credentials in the admin panel to persist them in app_settings.
  const login = Deno.env.get("ADMIN_INITIAL_LOGIN");
  const password = Deno.env.get("ADMIN_INITIAL_PASSWORD");
  if (!login || !password) {
    throw new Error(
      "Admin hali sozlanmagan. Supabase Edge Function secrets ichida ADMIN_INITIAL_LOGIN va kamida 12 belgili ADMIN_INITIAL_PASSWORD o‘rnating."
    );
  }
  return { login, hash: await sha256("xonqa:" + password) };
}

// Imzolangan sessiya tokeni: "<muddat>.<hmac>". admin_sessions jadvaliga bog'liq emas
// (u yerga yozish xato bersa ham login "muvaffaqiyatli" bo'lib, keyin "Sessiya tugagan" chiqardi).
const SESSION_TTL = 30 * 24 * 3600e3;
async function signSession(exp: number) {
  const a = await adminCreds();
  const secret = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "xonqa") + a.hash;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(exp)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function makeSession() {
  const exp = Date.now() + SESSION_TTL;
  return `${exp}.${await signSession(exp)}`;
}

async function requireAdmin(token: unknown) {
  if (typeof token !== "string" || !token) throw new Error("Avval tizimga kiring");
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (sig && Number.isFinite(exp) && exp > Date.now() && sig === (await signSession(exp))) return;
  // Eski tokenlar bilan moslik
  const { data } = await (await db()).from("admin_sessions").select("token").eq("token", token).maybeSingle();
  if (!data) throw new Error("Sessiya tugagan, qayta kiring");
}

const openNow = (h: Any) => {
  if (!h) return false;
  if (!h.enabled || h.open === h.close) return true;
  const d = new Date(Date.now() + 5 * 3600e3);
  const cur = d.getUTCHours() * 60 + d.getUTCMinutes();
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const s = m(h.open), e = m(h.close);
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
};

function customersOf(orders: Any[]) {
  const map = new Map();
  for (const o of orders) {
    const key = o.phone || o.userId;
    const c = map.get(key) || { userId: key, name: o.userName, username: "", phone: o.phone, count: 0, spent: 0, last: o.createdAt };
    c.count += 1;
    if (["delivered", "picked_up"].includes(o.status)) c.spent += Number(o.total) || 0;
    if (o.createdAt > c.last) c.last = o.createdAt;
    map.set(key, c);
  }
  return [...map.values()];
}

const pass = (d: Any) => d;
const TABLES = { product: "products", category: "categories", promotion: "promotions" } as const;

// ---------- Promotion pricing (mirrors src/admin/lib/promo-types.js) ----------
const txtOf = (v: Any) => (v && typeof v === "object" ? v.uz ?? v.ru ?? v.en ?? "" : v ?? "");
const promoDate = (value: Any, end = false) => {
  if (!value || typeof value !== "string") return null;
  const stamp = value.length <= 10 ? `${value}T${end ? "23:59:59" : "00:00:00"}+05:00`
    : /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}${value.length === 16 ? ":00" : ""}+05:00`;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) ? ms : null;
};
const promoLiveNow = (p: Any, now = Date.now()) => {
  const s = promoDate(p.startsAt), e = promoDate(p.endsAt, true);
  return !(s !== null && s > now) && !(e !== null && e <= now);
};
function birthdayInWindow(promo: Any, birthday: Any, now = Date.now()) {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(birthday || ""));
  if (!m) return false;
  let s = promoDate(promo.startsAt), e = promoDate(promo.endsAt, true);
  if (s === null && e === null) { s = now; e = now; } else { s = s ?? now; e = e ?? Math.max(now, s); }
  const y0 = new Date(s + 5 * 36e5).getUTCFullYear(), y1 = new Date(e + 5 * 36e5).getUTCFullYear();
  for (let y = y0; y <= y1; y++) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dd = m[1] === "02" && m[2] === "29" && !leap ? "28" : m[2];
    const ds = Date.parse(`${y}-${m[1]}-${dd}T00:00:00+05:00`);
    if (ds <= e && ds + 864e5 > s) return true;
  }
  return false;
}
function promoPrice(promo: Any, products: Any[]) {
  const round = (n: number) => Math.max(0, Math.round(n / 100) * 100);
  const v = Number(promo.value) || 0;
  const items = (promo.items ?? []).map((it: Any) => ({ product: products.find((p: Any) => p.id === it.productId), qty: Math.max(1, Number(it.qty) || 1) })).filter((x: Any) => x.product);
  const price = (p: Any) => Number(p.price) || 0;
  const full = items.reduce((t: number, x: Any) => t + price(x.product) * x.qty, 0);
  let final = full;
  const type = promo.type;
  if (type === "combo") final = Number(promo.setPrice) || full;
  else if (type === "bogo") {
    const buy = Math.max(1, Number(promo.buyQty) || 1), get = Math.max(1, Number(promo.getQty) || 1);
    final = items.reduce((t: number, x: Any) => t + price(x.product) * (x.qty - Math.floor(x.qty / (buy + get)) * get), 0);
  } else if (type === "second") {
    final = items.reduce((t: number, x: Any) => t + price(x.product) * x.qty - round(price(x.product) * (Math.min(v, 100) / 100)) * Math.floor(x.qty / 2), 0);
  } else if (type === "fixed") final = items.reduce((t: number, x: Any) => t + round(price(x.product) - v) * x.qty, 0);
  else if (type !== "gift" && type !== "delivery") final = items.reduce((t: number, x: Any) => t + round(price(x.product) * (1 - Math.min(v, 100) / 100)) * x.qty, 0);
  return { full, final: Math.min(full, final), names: items.map((x: Any) => `${txtOf(x.product.name)} × ${x.qty}`) };
}

// ---------- Public ----------
export const getPublicPromotions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await db()).from("promotions").select("id, data");
  if (error) throw new Error(`Aksiyalarni yuklab bo‘lmadi: ${error.message}`);
  return (data ?? []).map((row: Any) => ({ ...row.data, id: row.id })).filter((promo: Any) => promo.active !== false);
});

export const getPublicCard = createServerFn({ method: "GET" }).handler(async () => {
  const shop: Any = await getSetting("shop", { cardNumber: "", cardOwner: "" });
  return { cardNumber: String(shop.cardNumber || ""), cardOwner: String(shop.cardOwner || "") };
});

export const getPublicMenu = createServerFn({ method: "GET" }).handler(async () => {
  const s = await db();
  const [p, c] = await Promise.all([
    s.from("products").select("data").order("created_at"),
    s.from("categories").select("data, sort").order("sort"),
  ]);
  const promotions = await getPublicPromotions();
  if (p.error) throw new Error(p.error.message);
  if (c.error) throw new Error(c.error.message);
  return {
    promotions,
    products: (p.data ?? []).map((r: Any) => r.data).filter((x: Any) => x.available !== false),
    categories: (c.data ?? []).map((r: Any) => r.data).filter((x: Any) => x.active !== false),
  };
});

export const placeOrder = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data, req }: Any) => {
  const name = String(data?.name ?? "").trim().slice(0, 100);
  const phone = String(data?.phone ?? "").trim().slice(0, 30);
  const delivery = String(data?.delivery ?? "").trim().slice(0, 300);
  const items = Array.isArray(data?.items) ? data.items : [];
  const pickup = data?.method === "pickup" || /^O[‘’'ʻʼ`]?zim olib ketaman/i.test(String(data?.delivery ?? ""));
  const payment = data?.payment === "card" ? "card" : "cash";
  const note = String(data?.comment ?? "").trim().slice(0, 500);
  const address = String(data?.address ?? "").trim().slice(0, 300);
  const loc = data?.location && Number.isFinite(Number(data.location.lat)) && Number.isFinite(Number(data.location.lng))
    ? { name: String(data.location.name ?? "").slice(0, 300) || "Xaritada ochish", lat: Number(data.location.lat), lng: Number(data.location.lng), mapUrl: `https://maps.google.com/?q=${Number(data.location.lat)},${Number(data.location.lng)}` }
    : null;
  const rd = String(data?.receipt ?? "");
  const receiptInput = parseReceipt(rd);
  if (payment === "card" && (!receiptInput || rd.length >= 12_000_000)) throw new Error("Karta orqali to‘lovda chek (rasm yoki PDF, 9 MB gacha) talab qilinadi");
  if (!name || !phone || items.length === 0) throw new Error("Ma’lumotlar to‘liq emas");
  const s = await db();
  const hours = await getSetting("workHours", null);
  if (!hours) throw new Error("Ish vaqti hali sozlanmagan. Administrator panelida ish vaqtini kiriting.");
  if (!openNow(hours)) throw new Error(`Hozir sayt yopiq. Ish vaqtimiz: ${hours.open}–${hours.close} (Toshkent vaqti).`);
  const promoReqs = items.filter((i: Any) => i?.promoId);
  const productReqs = items.filter((i: Any) => !i?.promoId);
  const promoIds = [...new Set(promoReqs.map((i: Any) => String(i.promoId)))];
  const { data: promoRows, error: promoError } = promoIds.length
    ? await s.from("promotions").select("id, data").in("id", promoIds)
    : { data: [], error: null };
  if (promoError) throw new Error(`Aksiyalarni o‘qib bo‘lmadi: ${promoError.message}`);
  const promos = (promoRows ?? []).map((r: Any) => ({ ...r.data, id: r.id }));
  const ids = [...new Set([
    ...productReqs.map((i: Any) => String(i.productId)),
    ...promos.flatMap((p: Any) => (p.items ?? []).map((it: Any) => String(it.productId))),
  ])];
  const { data: rows, error: productsError } = ids.length ? await s.from("products").select("id, data").in("id", ids) : { data: [], error: null };
  if (productsError) throw new Error(`Mahsulotlarni o‘qib bo‘lmadi: ${productsError.message}`);
  const productLines = productReqs.map((i: Any) => {
    const p = rows?.find((r: Any) => r.id === String(i.productId))?.data;
    const q = Number(i.quantity);
    if (!p) throw new Error(`Mahsulot topilmadi: ${i.productId}`);
    if (!Number.isSafeInteger(q) || q < 1) throw new Error("Mahsulot miqdori musbat butun son bo‘lishi kerak");
    return { productId: String(i.productId), name: p.name ?? String(i.productId), price: Number(p.price) || 0, quantity: q };
  });
  let birthday: string | null | undefined;
  const getBirthday = async () => {
    if (birthday !== undefined) return birthday;
    birthday = null;
    const token = (req?.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token) {
      const { data: u } = await s.auth.getUser(token);
      if (u?.user) birthday = (await s.from("profiles").select("birthday").eq("user_id", u.user.id).maybeSingle()).data?.birthday ?? null;
    }
    return birthday;
  };
  const promoLines: Any[] = [];
  let discount = 0;
  const appliedPromos: Any[] = [];
  for (const i of promoReqs) {
    const promo = promos.find((p: Any) => p.id === String(i.promoId));
    const q = Number(i.quantity);
    if (!promo || promo.active === false || !promoLiveNow(promo)) throw new Error("Aksiya topilmadi yoki tugagan");
    if (!Number.isSafeInteger(q) || q < 1) throw new Error("Aksiya miqdori musbat butun son bo‘lishi kerak");
    if (promo.type === "birthday" && !birthdayInWindow(promo, await getBirthday())) throw new Error("Tug‘ilgan kun aksiyasi faqat tug‘ilgan kuni shu muddatga to‘g‘ri kelgan mijozlar uchun");
    const products = [...(rows ?? []).map((r: Any) => ({ ...r.data, id: r.id })), ...(promo.extraProducts ?? [])];
    const { full, final, names } = promoPrice(promo, products);
    if (!names.length) throw new Error("Aksiya tarkibi bo‘sh");
    const title = txtOf(promo.title) || "Aksiya";
    promoLines.push({ productId: `promo:${promo.id}`, promoId: promo.id, name: `Aksiya: ${title} (${names.join(", ")})`, price: final, fullPrice: full, quantity: q });
    discount += (full - final) * q;
    appliedPromos.push({ id: promo.id, title, quantity: q, saved: (full - final) * q });
  }
  const lines = [...productLines, ...promoLines];
  const subtotal = lines.reduce((t: number, l: Any) => t + l.price * l.quantity, 0);
  const order: Any = {
    userId: phone, userName: name, phone,
    address: pickup ? "Filial: https://maps.app.goo.gl/MFgUmBkDQvGbkkmRA" : (address || delivery),
    location: pickup ? { name: "Filial manzili", mapUrl: "https://maps.app.goo.gl/MFgUmBkDQvGbkkmRA" } : loc,
    deliveryType: pickup ? "pickup" : "delivery", paymentMethod: payment, note,
    receipt: receiptInput ? { kind: receiptInput.kind, fileName: `chek.${receiptInput.ext}`, storagePath: null, uploadedAt: new Date().toISOString() } : null,
    items: lines, subtotal: subtotal + discount, discount, total: subtotal, promotions: appliedPromos, status: "new", createdAt: new Date().toISOString(),
  };
  const owner = await notificationOwner(req, data);
  const { data: ins, error: insertError } = await s.from("orders").insert({ data: { ...order, checkoutPending: true } }).select("id").single();
  if (insertError) throw new Error(`Buyurtmani saqlab bo‘lmadi: ${insertError.message}`);
  const orderId = String(ins.id);
  if (receiptInput) {
    const binary = atob(receiptInput.encoded.replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const storagePath = `${orderId}/${crypto.randomUUID()}.${receiptInput.ext}`;
    const { error: uploadError } = await s.storage.from("order-receipts").upload(storagePath, bytes, {
      contentType: receiptInput.mime, upsert: false, cacheControl: "3600",
    });
    if (uploadError) {
      await s.from("orders").delete().eq("id", orderId);
      throw new Error(`Chekni xavfsiz saqlab bo‘lmadi. Supabase Storage’da order-receipts bucket yaratilganini tekshiring: ${uploadError.message}`);
    }
    order.receipt.storagePath = storagePath;
    order.receipt.fileName = `chek-${orderId}.${receiptInput.ext}`;
    const { error: updateError } = await s.from("orders").update({ notification_owner: owner, data: { ...order, id: orderId } }).eq("id", orderId);
    if (updateError) {
      await s.storage.from("order-receipts").remove([storagePath]);
      await s.from("orders").delete().eq("id", orderId);
      throw new Error(`Chek ma’lumotini buyurtmaga bog‘lab bo‘lmadi: ${updateError.message}`);
    }
  } else {
    const { error: updateError } = await s.from("orders").update({ notification_owner: owner, data: { ...order, id: orderId } }).eq("id", orderId);
    if (updateError) throw new Error(`Buyurtma raqamini saqlab bo‘lmadi: ${updateError.message}`);
  }
  return { id: orderId };
});

// ---------- Admin ----------
export const adminLoginFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  const a = await adminCreds();
  if (data?.login !== a.login || (await sha256("xonqa:" + String(data?.password ?? ""))) !== a.hash) {
    throw new Error("Login yoki parol noto‘g‘ri");
  }
  const token = await makeSession();
  return { ok: true, token };
});

export const adminLogoutFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  if (typeof data?.token === "string") await (await db()).from("admin_sessions").delete().eq("token", data.token);
  return { ok: true };
});

export const getReceiptFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const s = await db();
  if (data?.kind === "reservation") {
    const {data:r,error} = await s.from("reservations").select("receipt_path").eq("id",String(data.id)).single();
    if (error || !r?.receipt_path) throw new Error("Bron cheki topilmadi.");
    const result = await s.storage.from("order-receipts").createSignedUrl(r.receipt_path,60);
    if (result.error) throw new Error("Chek ochilmadi.");
    return {dataUrl:result.data.signedUrl};
  }
  const { data: row, error } = await s.from("orders").select("data").eq("id", String(data?.id)).maybeSingle();
  if (error) throw new Error(`Buyurtma chekini o‘qib bo‘lmadi: ${error.message}`);
  const rc = row?.data?.receipt;
  if (!rc) throw new Error("Bu buyurtmaga chek yuklanmagan.");
  // Legacy orders may still have a base64 data URL or a directly stored URL.
  const legacySrc = typeof rc === "string" ? rc : (rc.dataUrl || rc.url);
  if (legacySrc) return { dataUrl: legacySrc };
  if (!rc.storagePath) throw new Error("Chek fayli topilmadi. Eski buyurtmada chek saqlanmagan bo‘lishi mumkin.");
  const { data: signed, error: signError } = await s.storage.from("order-receipts").createSignedUrl(rc.storagePath, 60);
  if (signError || !signed?.signedUrl) throw new Error(`Chek fayliga vaqtinchalik havola yaratilmadi: ${signError?.message || "noma’lum xato"}`);
  return { dataUrl: signed.signedUrl };
});

export const getAdminDataFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const s = await db();
  const [c, p, o, pr, rs, vt] = await Promise.all([
    s.from("categories").select("data, sort").order("sort"),
    s.from("products").select("data").order("created_at"),
    s.from("orders").select("id, data").order("created_at", { ascending: false }).limit(1000),
    s.from("promotions").select("data").order("created_at"),
    s.from("reservations").select("*, venue_tables(name, area, capacity)").order("date", { ascending: false }).order("time", { ascending: false }).limit(500),
    s.from("venue_tables").select("*").order("name"),
  ]);
  for (const result of [c,p,o,pr,rs,vt]) if (result.error) throw new Error(result.error.message);
  // The list carries only receipt metadata; the file is fetched on demand.
  const orders = (o.data ?? []).filter((r: Any) => !r.data?.checkoutPending).map((r: Any) => {
    const d = { ...r.data, id: r.id };
    const addressText = String(d.address || d.delivery || "");
    if (d.deliveryType !== "pickup" && d.deliveryType !== "delivery") {
      d.deliveryType = /^O[‘’'ʻʼ`]?zim olib ketaman/i.test(addressText) || /filial/i.test(addressText) ? "pickup" : "delivery";
    }
    if (d.receipt) {
      const rc = typeof d.receipt === "string" ? { dataUrl: d.receipt } : d.receipt;
      const isPdf = rc.kind === "pdf" || String(rc.dataUrl || "").startsWith("data:application/pdf") || /\.pdf$/i.test(String(rc.fileName || rc.storagePath || ""));
      d.receipt = { kind: isPdf ? "pdf" : "image", fileId: rc.fileId || rc.storagePath || r.id, fileName: rc.fileName || `chek-${r.id}.${isPdf ? "pdf" : "jpg"}`, storagePath: rc.storagePath || null };
    }
    return d;
  });
  const workHours = await getSetting("workHours", null);
  return {
    categories: (c.data ?? []).map((r: Any) => ({ ...r.data, sort: r.sort })),
    products: (p.data ?? []).map((r: Any) => r.data),
    orders,
    promotions: (pr.data ?? []).map((r: Any) => r.data),
    customers: customersOf(orders),
    reservations: rs.data ?? [],
    venueTables: vt.data ?? [],
    workHours,
    openNow: openNow(workHours),
  };
});

export const saveItemFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const table = TABLES[data?.kind as keyof typeof TABLES];
  if (!table || !data?.item) throw new Error("Noto‘g‘ri so‘rov");
  const item = { ...data.item, id: String(data.item.id || `${data.kind}_${Date.now()}`) };
  const row: Any = { id: item.id, data: item };
  if (table === "categories") {
    row.sort = Number.isFinite(item.sort) ? item.sort : 999;
  }
  const { error } = await (await db()).from(table).upsert(row);
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const removeItemFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const table = TABLES[data?.kind as keyof typeof TABLES];
  if (!table) throw new Error("Noto‘g‘ri so‘rov");
  const { error } = await (await db()).from(table).delete().eq("id", String(data.id));
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const reorderCategoriesFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const s = await db();
  const ids: string[] = Array.isArray(data?.ids) ? data.ids : [];
  await Promise.all(ids.map((id, i) => s.from("categories").update({ sort: i }).eq("id", id)));
  return { ok: true };
});

function parseReceipt(rd: string) {

  const isPdf = /^data:application\/pdf;base64,/i.test(rd);
  const imageMatch = rd.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
  const pdfMatch = rd.match(/^data:application\/pdf;base64,([\s\S]+)$/i);
  return isPdf && pdfMatch ? { kind: "pdf", mime: "application/pdf", encoded: pdfMatch[1], ext: "pdf" }
    : imageMatch ? { kind: "image", mime: imageMatch[1].toLowerCase(), encoded: imageMatch[2], ext: /jpe?g/i.test(imageMatch[1]) ? "jpg" : imageMatch[1].split("/")[1] }
    : null;
}

function bookingStart(date: string, time: string) {
  const local = date + "T" + time;
  const start = Date.parse(local + ":00+05:00");
  if (!Number.isFinite(start) || new Date(start + 5 * 3600000).toISOString().slice(0,16) !== local || start <= Date.now())
    throw new Error("Toshkent vaqti bo‘yicha kelajakdagi sana va soatni tanlang.");
  return start;
}

export const getAvailableVenueTables = async ({ data }: Any) => {
  const s = await db();
  const { data: tables, error: tableError } = await s.from("venue_tables").select("id,name,capacity,area,booking_fee,image_url").eq("active", true).order("name");
  if (tableError) throw new Error(tableError.message);
  const date = String(data?.date ?? ""), time = String(data?.time ?? "");
  const guests = Math.max(1, Math.floor(Number(data?.guests) || 1));
  const duration = Math.min(600, Math.max(30, Math.floor(Number(data?.durationMinutes) || 120)));
  const start = bookingStart(date,time);
  const endLocal = new Date(start + (duration + 300)*60000).toISOString().slice(0,19);
  const range = `[${date}T${time},${endLocal})`;
  const {data: conflicts,error} = await s.from("reservations").select("table_id").overlaps("slot_range",range).in("status",["new","confirmed"]);
  if (error) throw new Error(error.message);
  const occupied = new Set((conflicts ?? []).map((r:Any) => r.table_id));
  return (tables ?? []).map((t:Any) => ({...t, available:t.capacity >= guests && !occupied.has(t.id)}));
};

export const createReservation = async ({ data, req }: Any) => {
  const name = String(data?.name ?? "").trim().slice(0, 80);
  const phone = String(data?.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  const date = String(data?.date ?? ""); const time = String(data?.time ?? "");
  const guests = Math.floor(Number(data?.guests));
  const duration = Math.floor(Number(data?.durationMinutes ?? 120));
  const eventType = ["regular", "birthday", "celebration", "business", "other"].includes(data?.eventType) ? data.eventType : "regular";
  const tableId = String(data?.tableId ?? "");
  if (name.length < 2) throw new Error("Ismingizni kiriting");
  if (phone.length < 9) throw new Error("Telefon raqamini to‘g‘ri kiriting");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Sana va vaqtni tanlang");
  bookingStart(date,time);
  if (!(guests >= 1 && guests <= 100)) throw new Error("Mehmonlar soni 1 dan 100 gacha");
  if (!(duration >= 30 && duration <= 600)) throw new Error("Davomiylik 30 daqiqadan 10 soatgacha bo‘lishi kerak");
  if (!tableId) throw new Error("Stolni tanlang");
  const owner = await notificationOwner(req,data);
  const s = await db();
  const { data: table, error: tableError } = await s.from("venue_tables").select("id,capacity,active,name,booking_fee").eq("id", tableId).single();
  if (tableError || !table || !table.active) throw new Error("Tanlangan stol mavjud emas");
  if (guests > table.capacity) throw new Error(`Bu stol ${table.capacity} kishiga mo‘ljallangan`);
  if (Number(data?.expectedFee ?? 0) !== table.booking_fee) throw new Error("Stol narxi o‘zgardi. Narxni qayta tekshiring.");
  let path: string | null = null;
  if (table.booking_fee > 0) {
    const raw = String(data?.receipt ?? "");
    const receipt = raw.length < 12000000 && parseReceipt(raw);
    if (!receipt) throw new Error("To‘lov chekini rasm yoki PDF shaklida yuklang.");
    const bytes = Uint8Array.from(atob(receipt.encoded), ch => ch.charCodeAt(0));
    path = `reservations/${crypto.randomUUID()}.${receipt.ext}`;
    const {error} = await s.storage.from("order-receipts").upload(path,bytes,{contentType:receipt.mime});
    if (error) throw new Error("Chekni saqlab bo‘lmadi.");
  }
  const { data: row, error } = await s.from("reservations").insert({ notification_owner: owner, booking_fee:table.booking_fee, receipt_path:path, name, phone, date, time, guests, table_id: tableId, event_type: eventType, event_title: String(data?.eventTitle ?? "").trim().slice(0,100), duration_minutes: duration, note: String(data?.note ?? "").slice(0, 300) }).select("id").single();
  if (error) {
    if (path) await s.storage.from("order-receipts").remove([path]);
    throw new Error(error.code === "23P01" ? "Bu vaqt band qilindi. Boshqa vaqtni tanlang." : error.message);
  }
  return { id: row.id };
};

export const saveVenueTable = async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const table = data?.table ?? {};
  const name = String(table.name ?? "").trim().slice(0, 50);
  const capacity = Math.floor(Number(table.capacity));
  if (!name || !(capacity >= 1 && capacity <= 100)) throw new Error("Stol nomi va 1–100 oralig‘idagi sig‘imni kiriting");
  const fee = Number(table.booking_fee ?? 0);
  const image = String(table.image_url || "").trim();
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > 2147483647) throw new Error("Bron narxini tekshiring.");
  const galleryImage = image.length <= 60000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(image);
  if (image && !galleryImage && (!/^https:\/\//i.test(image) || image.length > 2048)) throw new Error("Rasm uchun HTTPS havolasini kiriting.");
  const row = { booking_fee:fee,image_url:image, ...(table.id ? { id: table.id } : {}), name, capacity, area: String(table.area ?? "Asosiy zal").trim().slice(0,60) || "Asosiy zal", active: table.active !== false };
  const { data: saved, error } = await (await db()).from("venue_tables").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return saved;
};

export const deleteVenueTable = async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const { error } = await (await db()).from("venue_tables").delete().eq("id", String(data?.id ?? ""));
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const updateReservationStatus = async ({ data }: Any) => {
  await requireAdmin(data?.token);
  if (!["new", "confirmed", "cancelled", "done"].includes(data?.status)) throw new Error("Noto‘g‘ri holat");
  const s = await db();
  const { error } = await s.from("reservations").update({ status: data.status }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const updateOrderStatusFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const s = await db();
  const { data: row } = await s.from("orders").select("data").eq("id", String(data.id)).maybeSingle();
  if (!row) throw new Error("Buyurtma topilmadi");
  const permitted = row.data?.deliveryType === "pickup"
    ? ["new","received","preparing","ready_pickup","picked_up","cancelled"]
    : ["new","received","preparing","on_way","delivered","cancelled"];
  if (!permitted.includes(data.status)) throw new Error("Buyurtma holati noto‘g‘ri");
  const next = { ...row.data, status: data.status, ...(data.reason ? { cancelReason: data.reason } : {}) };
  const { error } = await s.from("orders").update({ data: next }).eq("id", String(data.id));
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const getWorkHoursFn = createServerFn({ method: "GET" }).handler(async () => {
  const workHours = await getSetting("workHours", null);
  return { workHours, openNow: openNow(workHours) };
});

export const saveWorkHoursFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  await setSetting("workHours", data.hours);
  return { ok: true };
});

export const getShopSettingsFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const shop = await getSetting("shop", { cardNumber: "", cardOwner: "" });
  return { ...shop, adminLogin: (await adminCreds()).login };
});

export const saveShopSettingsFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const cur = await getSetting("shop", {});
  const settings = { ...cur, cardNumber: String(data.cardNumber ?? ""), cardOwner: String(data.cardOwner ?? "") };
  await setSetting("shop", settings);
  return { ok: true, settings };
});

export const saveAdminCredsFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  await requireAdmin(data?.token);
  const a = await adminCreds();
  if ((await sha256("xonqa:" + String(data.currentPassword ?? ""))) !== a.hash) throw new Error("Joriy parol noto‘g‘ri");
  const nextPassword = String(data.adminPassword ?? "");
  if (nextPassword && nextPassword.length < 12) throw new Error("Yangi parol kamida 12 belgidan iborat bo‘lsin");
  const next = {
    login: String(data.adminLogin || a.login),
    hash: nextPassword ? await sha256("xonqa:" + nextPassword) : a.hash,
  };
  await setSetting("admin", next);
  return { ok: true, adminLogin: next.login };
});

// Mijoz o'z buyurtmasi holatini ko'radi (id + telefon bilan tekshiriladi)
export const getMyOrderStatusFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  const { data: row } = await (await db()).from("orders").select("data").eq("id", String(data?.id ?? "")).maybeSingle();
  if (!row || String(row.data?.phone ?? "").trim() !== String(data?.phone ?? "").trim()) throw new Error("Buyurtma topilmadi");
  return { id: String(data.id), status: row.data?.status || "new", cancelReason: row.data?.cancelReason || "" };
});

// Mijoz faqat qabul qilinmagan ("new") buyurtmani bekor qila oladi
export const cancelMyOrderFn = createServerFn({ method: "POST" }).inputValidator(pass).handler(async ({ data }: Any) => {
  const s = await db();
  const { data: row } = await s.from("orders").select("data").eq("id", String(data?.id ?? "")).maybeSingle();
  if (!row || String(row.data?.phone ?? "").trim() !== String(data?.phone ?? "").trim()) throw new Error("Buyurtma topilmadi");
  if ((row.data?.status || "new") !== "new") throw new Error("Buyurtma qabul qilingan — uni endi bekor qilib bo‘lmaydi.");
  const next = { ...row.data, status: "cancelled", cancelReason: "Mijozning o‘zi bekor qildi" };
  const { error } = await s.from("orders").update({ data: next }).eq("id", String(data.id));
  if (error) throw new Error(error.message);
  return { ok: true };
});

async function notificationOwner(req: Request, data: Any) {
  const token = req?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const client = await db();
    const {data: session} = await client.auth.getUser(token);
    if (session.user) return "user:" + session.user.id;
  }
  const key = String(data?.guestKey || "");
  return /^[a-f0-9-]{36}$/i.test(key) ? "guest:" + await sha256(key) : null;
}

export async function customerStatusFeed({ req, data }: Any) {
  const owner = await notificationOwner(req, data);
  const after = Number(data?.after || 0);
  if (!owner || !Number.isSafeInteger(after) || after < 0) return [];
  const {data: rows, error} = await (await db()).from("customer_status_events")
    .select("id,kind,reference,status,reason").eq("owner_key", owner)
    .gt("id", after).order("id").limit(100);
  if (error) throw new Error("Bildirishnomalarni olib bo‘lmadi");
  const ids = [...new Set(rows.filter((row: Any) => row.kind === "reservations").map((row: Any) => row.reference))];
  if (!ids.length) return rows;
  const { data: bookings, error: lookupError } = await (await db()).from("reservations")
    .select("id,venue_tables(name)").eq("notification_owner", owner).in("id", ids);
  if (lookupError) throw new Error("Stol nomlarini olib bo‘lmadi");
  const names = new Map(bookings.map((booking: Any) => [booking.id, booking.venue_tables?.name]));
  return rows.map((row: Any) => row.kind === "reservations"
    ? { ...row, tableName: names.get(row.reference) || "" } : row);
}
