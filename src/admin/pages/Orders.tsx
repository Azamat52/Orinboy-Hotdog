import { FileText } from "lucide-react";
import { ReceiptPreview } from "@/admin/components/ReceiptPreview";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import { Bike, CreditCard, MapPin, Phone, Search, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/admin/components/page-header";
import { useAdminUrlState, useListPage } from "@/admin/hooks/useAdminUrlState";
import { ListPager } from "@/admin/components/ListPager";
import { StatusBadge } from "@/admin/components/status-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CANCEL_REASONS,
  STATUS_LABELS,
  nextStatusesFor,
  fmtDate,
  fmtSum,
  statusesFor,
} from "@/admin/lib/shop-types";
import { useAdminStore } from "@/admin/store/admin-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { orderDetails } from "@/lib/order-details";

const STATUSES = Object.keys(STATUS_LABELS);
function OrdersPage() {
  useEffect(() => {
    document.title = "Buyurtmalar \u2014 Xonqa Admin";
  }, []);
  const { orders, setOrderStatus, newOrdersCount } = useAdminStore();
  const { get, patch } = useAdminUrlState();
  const filter = get("status", "all");
  const search = get("q");
  const selectedId = get("order") || null;
  const setFilter = (value: string) => patch({ status: value, page: null });
  const setSearch = (value: string) => patch({ q: value, page: null }, true);
  const setSelectedId = (value: string | null) => patch({ order: value });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        o.items.some((i) => txt(i.name).toLowerCase().includes(q))
      );
    });
  }, [orders, filter, search]);
  const paging = useListPage(filtered.length, get("page"));
  const pageItems = filtered.slice(paging.start, paging.start + paging.size);
  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );
  return (
    <>
      <PageHeader
        title="Buyurtmalar"
        subtitle={`${orders.length} ta buyurtma · ${newOrdersCount} ta yangi`}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish: raqam, mijoz, telefon, mahsulot..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {search ? (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Tozalash"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label="Hammasi" />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={STATUS_LABELS[s]}
          />
        ))}
      </div>

      <div className="grid gap-3 lg:hidden">
        {pageItems.map((o) => (
          <Button
            key={o.id}
            variant="ghost"
            onClick={() => setSelectedId(o.id)}
            className="panel order-card h-auto w-full flex-col items-stretch gap-3 whitespace-normal p-4 text-left"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="break-words font-semibold">{o.id}</p>
                <p className="break-words text-sm text-muted-foreground">{o.userName}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <div className="min-w-0 text-xs text-muted-foreground">
                <p>
                  {o.deliveryType === "pickup" ? "Olib ketish" : "Yetkazish"} ·{" "}
                  {o.items.reduce((n, i) => n + i.quantity, 0)} ta
                </p>
                <p className="mt-1">{fmtDate(o.createdAt)}</p>
              </div>
              <p className="text-sm font-semibold">
                {fmtSum(o.total)}
                <span
                  className={
                    "ml-1.5 rounded px-1.5 py-0.5 text-[10px] " +
                    (o.promotions?.length
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {o.promotions?.length ? "Aksiya" : "Oddiy"}
                </span>
              </p>
            </div>
          </Button>
        ))}
        {!filtered.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Bu holatda buyurtma yo'q.
          </p>
        ) : null}
      </div>
      <div className="panel hidden overflow-hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buyurtma</TableHead>
              <TableHead>Mijoz</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Mahsulotlar</TableHead>
              <TableHead>Jami</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Holat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelectedId(o.id)}>
                <TableCell className="font-display font-semibold">{o.id}</TableCell>
                <TableCell>{o.userName}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    {o.deliveryType === "pickup" ? (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" /> Olib ketish
                      </>
                    ) : (
                      <>
                        <Bike className="h-3.5 w-3.5" /> Yetkazish
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {o.items.reduce((n, i) => n + i.quantity, 0)} ta
                </TableCell>
                <TableCell className="font-medium">
                  {fmtSum(o.total)}
                  <span
                    className={
                      "ml-2 rounded px-1.5 py-0.5 text-[10px] " +
                      (o.promotions?.length
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {o.promotions?.length ? "Aksiya" : "Oddiy"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(o.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {search
                    ? `"${search}" bo'yicha hech narsa topilmadi.`
                    : "Bu holatda buyurtma yo'q."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <ListPager page={paging.page} count={paging.pageCount} onChange={(page) => patch({ page })} />
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected ? (
            <OrderDetails
              order={selected}
              onStatus={(s, reason) => {
                setOrderStatus(selected.id, s, reason);
                toast.success(`${selected.id}: ${STATUS_LABELS[s]}`);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
function OrderDetails({ order: o, onStatus }) {
  const allowed = nextStatusesFor(o);
  const details = orderDetails(o);
  const locked = o.status === "cancelled" || o.status === "delivered" || o.status === "picked_up";
  const [cancelOpen, setCancelOpen] = useState(false);
  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle className="font-display text-xl">{o.id}</SheetTitle>
        <p className="text-sm text-muted-foreground">
          {o.userName} · {fmtDate(o.createdAt)}
        </p>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={o.status} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {o.deliveryType === "pickup" ? (
            <>
              <ShoppingBag className="h-3 w-3" /> Olib ketish
            </>
          ) : (
            <>
              <Bike className="h-3 w-3" /> Yetkazish
            </>
          )}
        </span>
      </div>

      {o.status === "cancelled" && o.cancelReason ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Bekor qilish sababi: {o.cancelReason}
        </p>
      ) : null}

      {o.status === "new" ? (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold">Yangi buyurtma — qaror qabul qiling</p>
          <p className="text-xs text-muted-foreground">
            Mijozga "tasdiq kutilmoqda" deb xabar berilgan.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onStatus("received")}>
              Qabul qilish
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => setCancelOpen(true)}>
              Bekor qilish
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Holatni o'zgartirish</h3>
          {locked ? (
            <p className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              Bu buyurtma yakunlangan — holatini o'zgartirib bo'lmaydi.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              <Chip active label={STATUS_LABELS[o.status]} onClick={() => {}} />
              {allowed.map((s) => (
                <Chip
                  key={s}
                  active={o.status === s}
                  onClick={() => (s === "cancelled" ? setCancelOpen(true) : onStatus(s))}
                  label={STATUS_LABELS[s]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderId={o.id}
        onConfirm={(reason) => {
          setCancelOpen(false);
          onStatus("cancelled", reason);
        }}
      />

      {o.receipt ? (
        <ReceiptPreview
          kind="order"
          id={o.id}
          dataUrl={typeof o.receipt === "string" ? o.receipt : o.receipt.dataUrl}
        />
      ) : o.paymentMethod === "card" ? (
        <p>Bu buyurtmaga chek yuklanmagan.</p>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Mahsulotlar</h3>
        <ul className="space-y-1.5 rounded-lg border border-border p-3">
          {o.items.map((i) => (
            <li key={i.productId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
              <span>
                {txt(i.name)} × {i.quantity}
              </span>
              <span>{fmtSum(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
        <Row label="Mahsulotlar" value={fmtSum(o.subtotal)} />
        <Row label="Yetkazish" value="Haydovchi bilan kelishiladi" />
        {o.discount > 0 && <Row label="Chegirma" value={"−" + fmtSum(o.discount)} />}
        <Row label="Jami" value={fmtSum(o.total)} bold />
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-muted-foreground">Buyurtma turi</span>
          {o.promotions?.length ? (
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {" "}
              Aksiya: {o.promotions.map((x) => txt(x.title)).join(", ")}
            </span>
          ) : (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Oddiy buyurtma
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 rounded-lg border border-border p-3 text-sm text-muted-foreground">
        {!details.pickup && details.name ? (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <a
              href={details.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 break-words underline"
            >
              {details.name}
            </a>
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <ShoppingBag className="size-3.5 shrink-0" /> Olib ketish
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0" /> {details.phone}
        </p>
        <p className="flex items-center gap-1.5">
          <CreditCard className="size-3.5 shrink-0" />{" "}
          {details.paymentMethod === "card"
            ? " Karta orqali"
            : details.paymentMethod === "cash"
              ? " Naqd pul"
              : details.paymentMethod || "Ko‘rsatilmagan"}
        </p>
        {details.note ? (
          <p className="flex items-start gap-1.5">
            <FileText className="mt-0.5 size-3.5 shrink-0" /> Izoh: {details.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
function CancelDialog({ open, onOpenChange, orderId, onConfirm }) {
  const [choice, setChoice] = useState(null);
  const [other, setOther] = useState("");
  useEffect(() => {
    if (open) {
      setChoice(null);
      setOther("");
    }
  }, [open]);
  const reason = choice === "other" ? other.trim() : choice;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{orderId} — bekor qilish sababi</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Mijoz bekor qilish sababini saytdagi bildirishnomada ko‘radi.
        </p>
        <div className="grid gap-2">
          {[...CANCEL_REASONS, "other"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setChoice(r)}
              className={
                choice === r
                  ? "rounded-lg border border-primary bg-primary/10 px-3 py-2 text-left text-sm"
                  : "rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
              }
            >
              {r === "other" ? "Boshqa sabab…" : r}
            </button>
          ))}
          {choice === "other" ? (
            <Textarea
              autoFocus
              value={other}
              maxLength={500}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Sababni yozing..."
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Orqaga
          </Button>
          <Button variant="destructive" disabled={!reason} onClick={() => onConfirm(reason)}>
            Bekor qilish va yuborish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Row({ label, value, bold = false }) {
  return (
    <div className={bold ? "grid grid-cols-2 gap-3 font-semibold" : "grid grid-cols-2 gap-3"}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="text-right break-words">{value}</span>
    </div>
  );
}
function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary"
          : "rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
export { OrdersPage as default };

// Matn ko'p tilli obyekt ({uz, ru, en}) bo'lishi mumkin — React obyektni chiqara olmaydi.
function txt(v) {
  return v && typeof v === "object" ? (v.uz ?? v.ru ?? v.en ?? "") : (v ?? "");
}
