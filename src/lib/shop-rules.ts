export const PRODUCTS_PER_PAGE = 9;
export const PROMOTIONS_PER_PAGE = 4;
export function paginate(items, page, size) {
  const pageCount = Math.ceil(items.length / size);
  const currentPage = Math.max(1, Math.min(page, pageCount || 1));
  return {
    items: items.slice((currentPage - 1) * size, currentPage * size),
    pageCount,
    currentPage,
  };
}
export function pageNumbers(page, count) {
  if (count < 1) return [];
  const current = Math.max(1, Math.min(page, count));
  const start = Math.max(1, current - 3);
  return Array.from({ length: Math.min(count, current + 3) - start + 1 }, (_, i) => start + i);
}
export function updateCartQuantity(cart, id, delta) {
  if (!cart.some((item) => item.id === id)) return delta > 0 ? [...cart, { id, qty: delta }] : cart;
  return cart
    .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
}
export function normalizeRows(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((row) => {
      let value = row?.data ?? row;
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          return null;
        }
      }
      return value && typeof value === "object" ? { ...value, id: value.id ?? row.id } : null;
    })
    .filter(Boolean);
}

/** Resolve visible cart rows without deleting items while the menu is loading. */
export function resolveCartItems(cart = [], products = []) {
  const byId = new Map(products.filter(Boolean).map((p) => [p.id, p]));
  return cart
    .filter((item) => item && Number.isSafeInteger(item.qty) && item.qty > 0)
    .flatMap((item) => {
      const product = byId.get(item.id);
      return product ? [{ ...item, product }] : [];
    });
}

/** Old servers reject promo lines; send the promo's real products instead and describe the promo in a note. */
export function promoFallbackOrder(items = [], promos = [], cartItems = []) {
  const qty = new Map();
  const notes = [];
  const title = (v) => (v && typeof v === "object" ? (v.uz ?? v.ru ?? v.en ?? "") : (v ?? ""));
  for (const it of items) {
    if (!it?.promoId) {
      qty.set(String(it.productId), (qty.get(String(it.productId)) || 0) + it.quantity);
      continue;
    }
    const promo = promos.find((p) => p.id === it.promoId);
    if (!promo) throw new Error("Aksiya topilmadi yoki tugagan");
    for (const x of promo.items ?? []) {
      const n = (Number(x.qty) || 1) * it.quantity;
      if (x.productId && n > 0)
        qty.set(String(x.productId), (qty.get(String(x.productId)) || 0) + n);
    }
    const price = cartItems.find((c) => c.product?.promoId === it.promoId)?.product?.price;
    notes.push(
      ` AKSIYA: ${title(promo.title) || "Aksiya"} × ${it.quantity}${price ? ` — aksiya narxi ${Number(price).toLocaleString("ru-RU")} so‘m` : ""}`,
    );
  }
  if (![...qty.values()].some((n) => n > 0)) throw new Error("Aksiya tarkibi bo‘sh");
  return {
    items: [...qty].map(([productId, quantity]) => ({ productId, quantity })),
    note: notes.join("\n"),
  };
}
