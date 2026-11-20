import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImagePicker } from "@/admin/components/image-picker";
import { ReceiptPreview } from "@/admin/components/ReceiptPreview";

import { useState } from "react";
import { useAdminStore } from "@/admin/store/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LABELS = {
  new: "Yangi",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
  done: "Yakunlangan",
};
const EVENT_LABELS = {
  regular: "Oddiy tashrif",
  birthday: "Tug‘ilgan kun",
  celebration: "Bazm / bayram",
  business: "Biznes uchrashuv",
  other: "Boshqa tadbir",
};
const EMPTY = {
  name: "",
  capacity: 4,
  area: "Asosiy zal",
  active: true,
  booking_fee: 0,
  image_url: "",
};

export default function Reservations() {
  const {
    reservations,
    venueTables,
    setReservationStatus,
    saveVenueTable,
    deleteVenueTable,
    loading,
    busy,
  } = useAdminStore();
  const [imageBusy, setImageBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("Barchasi");

  const [editing, setEditing] = useState(null);
  const now = new Date(Date.now() + 5 * 3600e3);
  const today = now.toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const visible = reservations
    .filter(
      (row) =>
        (!date || row.date === date) &&
        (!status || row.status === status) &&
        [row.name, row.phone, row.venue_tables?.name].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const occupiedNow = new Set(
    reservations
      .filter((r) => {
        const start = Date.parse(r.date + "T" + r.time.slice(0, 5) + ":00+05:00");
        return (
          ["new", "confirmed"].includes(r.status) &&
          start <= Date.now() &&
          Date.now() < start + Number(r.duration_minutes || 120) * 60000
        );
      })
      .map((r) => r.table_id),
  );
  const tableStatus = (t) => (!t.active ? "Yopiq" : occupiedNow.has(t.id) ? "Band" : "Bo‘sh");
  const submit = async (e) => {
    e.preventDefault();
    if (imageBusy) return;
    const ok = await saveVenueTable({ ...form, ...(editing ? { id: editing } : {}) });
    if (ok) {
      setOpen(false);
      setForm(EMPTY);
      setEditing(null);
    }
  };
  const edit = (table) => {
    setOpen(true);
    setEditing(table.id);
    setForm({
      name: table.name,
      capacity: table.capacity,
      area: table.area,
      active: table.active,
      booking_fee: table.booking_fee || 0,
      image_url: table.image_url || "",
    });
  };
  return (
    <div className="space-y-8 p-4 md:p-6">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Stollar va joylar</h1>
          <p className="text-sm text-muted-foreground">
            Zaldagi stollarni qo‘shing, sig‘imini va holatini boshqaring.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          Stol qo‘shish
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Stolni tahrirlash" : "Yangi stol"}</DialogTitle>
              <DialogDescription>
                Joylashuv, sig‘im va bir bron uchun narxni kiriting.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={submit}
              className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
            >
              <div className="grid gap-1">
                <Label>Stol nomi</Label>
                <Input
                  required
                  maxLength={50}
                  placeholder="Masalan, Stol 1"
                  value={form.name}
                  onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Sig‘imi (kishi)</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={form.capacity}
                  onChange={(e) => setForm((v) => ({ ...v, capacity: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Joylashuvi</Label>
                <Input
                  maxLength={60}
                  value={form.area}
                  onChange={(e) => setForm((v) => ({ ...v, area: e.target.value }))}
                />
              </div>
              <label>
                Bron narxi (so‘m)
                <Input
                  type="number"
                  min={0}
                  max={2147483647}
                  required
                  value={form.booking_fee}
                  onChange={(e) => setForm({ ...form, booking_fee: Number(e.target.value) })}
                />
              </label>
              <div className="sm:col-span-2">
                <ImagePicker
                  value={form.image_url}
                  disabled={busy}
                  onBusyChange={setImageBusy}
                  onChange={(image_url) => setForm((current) => ({ ...current, image_url }))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button disabled={busy || imageBusy} type="submit">
                  {editing ? "Saqlash" : "Stol qo‘shish"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Bekor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <div className="flex flex-wrap gap-2">
          {["Barchasi", "Bo‘sh", "Band", "Yopiq"].map((label) => (
            <Button
              key={label}
              aria-pressed={group === label}
              variant={group === label ? "default" : "outline"}
              onClick={() => setGroup(label)}
            >
              {label} ·{" "}
              {venueTables.filter((t) => label === "Barchasi" || tableStatus(t) === label).length}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {venueTables
            .filter((t) => group === "Barchasi" || tableStatus(t) === group)
            .map((table) => (
              <article key={table.id} className="rounded-xl border bg-card p-4">
                {table.image_url && (
                  <img
                    src={table.image_url}
                    alt={table.name}
                    loading="lazy"
                    className="mb-3 h-28 w-full rounded-xl object-cover"
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{table.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {table.area} · {table.capacity} kishi ·{" "}
                      {table.booking_fee ? table.booking_fee.toLocaleString() + " so‘m" : "Bepul"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${!table.active ? "bg-muted text-muted-foreground" : occupiedNow.has(table.id) ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                  >
                    {!table.active
                      ? "Yopiq"
                      : occupiedNow.has(table.id)
                        ? "Hozir band"
                        : "Hozir bo‘sh"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(table)}>
                    Tahrirlash
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveVenueTable({ ...table, active: !table.active })}
                  >
                    {table.active ? "Yopish" : "Ochish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`${table.name} stolini o‘chirasizmi?`))
                        void deleteVenueTable(table.id);
                    }}
                  >
                    O‘chirish
                  </Button>
                </div>
              </article>
            ))}
          {venueTables.length > 0 &&
            !venueTables.some((t) => group === "Barchasi" || tableStatus(t) === group) && (
              <p>Bu holatdagi stol yo‘q.</p>
            )}
          {!venueTables.length && (
            <p className="text-sm text-muted-foreground">Hozircha stol qo‘shilmagan.</p>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Joy band qilish so‘rovlari</h2>
          <p className="text-sm text-muted-foreground">
            Mijozlar saytdan yuborgan stol va tadbir buyurtmalari.
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3">
          <label>
            Mijoz yoki stol
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label>
            Sana
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Holat
            <select
              className="block w-full rounded-md border bg-background p-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Barchasi</option>
              {Object.entries(LABELS).map(([id, text]) => (
                <option key={id} value={id}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => setDate(today)}>
            Bugungi bronlar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setDate("");
              setStatus("");
            }}
          >
            Filtrlarni tozalash
          </Button>
          <p aria-live="polite">
            {visible.length} ta bron ·{" "}
            {visible
              .filter((r) => r.status !== "cancelled")
              .reduce((sum, r) => sum + Number(r.guests), 0)}{" "}
            mehmon
          </p>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Yuklanmoqda…</p>
        ) : !visible.length ? (
          <p className="text-muted-foreground">Tanlangan shartlar bo‘yicha bron topilmadi.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana / vaqt</TableHead>
                  <TableHead>Stol</TableHead>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Tadbir</TableHead>
                  <TableHead>Mehmon</TableHead>
                  <TableHead>Bron to‘lovi</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {r.date} {r.time}
                      <div className="text-xs text-muted-foreground">
                        {r.duration_minutes || 120} daqiqa
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.venue_tables?.name || "Stol o‘chirilgan"}
                      <div className="text-xs text-muted-foreground">{r.venue_tables?.area}</div>
                    </TableCell>
                    <TableCell>
                      {r.name}
                      <div>
                        <a className="text-sm text-muted-foreground" href={`tel:${r.phone}`}>
                          {r.phone}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      {EVENT_LABELS[r.event_type] || r.event_type}
                      {r.event_title && (
                        <div className="text-xs text-muted-foreground">{r.event_title}</div>
                      )}
                      <div className="max-w-48 text-xs text-muted-foreground">{r.note}</div>
                    </TableCell>
                    <TableCell>{r.guests}</TableCell>
                    <TableCell>
                      {r.booking_fee ? r.booking_fee.toLocaleString() + " so‘m" : "Bepul"}
                      {r.receipt_path && <ReceiptPreview kind="reservation" id={r.id} />}
                    </TableCell>
                    <TableCell>{LABELS[r.status] ?? r.status}</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      {r.status === "new" && (
                        <Button size="sm" onClick={() => setReservationStatus(r.id, "confirmed")}>
                          Tasdiqlash
                        </Button>
                      )}
                      {r.status === "confirmed" && (
                        <Button size="sm" onClick={() => setReservationStatus(r.id, "done")}>
                          Yakunlash
                        </Button>
                      )}
                      {(r.status === "new" || r.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReservationStatus(r.id, "cancelled")}
                        >
                          Bekor qilish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
