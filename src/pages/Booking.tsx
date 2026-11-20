import { bookingGuestKey } from "@/components/site/CustomerNotifications";
import { readReceipt } from "@/lib/read-receipt";
import { ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { createReservation, getAvailableVenueTables, loadCard } from "@/admin/lib/admin.functions";
import { useStoreState, type ReservationForm } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const initial: ReservationForm = {
  name: "",
  phone: "",
  date: "",
  time: "",
  guests: 2,
  note: "",
  tableId: "",
  eventType: "regular",
  eventTitle: "",
  durationMinutes: 120,
};
const EVENTS = [
  { value: "regular", label: "Oddiy tashrif" },
  { value: "birthday", label: "Tug‘ilgan kun" },
  { value: "celebration", label: "Bazm / bayram" },
  { value: "business", label: "Biznes uchrashuv" },
  { value: "other", label: "Boshqa tadbir" },
];

export default function Booking() {
  const [form, setForm] = useStoreState("reservation", "form");
  const [sending, setSending] = useStoreState("reservation", "sending");
  const [bookedTableName, setBookedTableName] = useStoreState("reservation", "bookedTableName");
  const [period, setPeriod] = useState(
    form.time && Number(form.time.slice(0, 2)) >= 12 ? "Kechki" : "Ertalab",
  );
  const [receipt, setReceipt] = useState("");
  const [reading, setReading] = useState(false);
  const [card, setCard] = useState({ cardNumber: "", cardOwner: "" });
  useEffect(() => {
    loadCard()
      .then((c) => c && setCard(c))
      .catch(() => {});
  }, []);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("xonqa-db", refresh);
    return () => window.removeEventListener("xonqa-db", refresh);
  }, []);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!form.date || !form.time) {
      setTables([]);
      setLoadingTables(false);
      return;
    }
    let active = true;
    setLoadingTables(true);
    getAvailableVenueTables({
      date: form.date,
      time: form.time,
      guests: Number(form.guests),
      durationMinutes: Number(form.durationMinutes),
    })
      .then((rows) => {
        if (active) {
          setTables(rows);
          setForm((current) =>
            current.tableId && !rows.some((t) => t.id === current.tableId && t.available)
              ? { ...current, tableId: "" }
              : current,
          );
        }
      })
      .catch((error) => {
        if (active) {
          setTables([]);
          setForm((current) => ({ ...current, tableId: "" }));
          toast.error(error.message || "Stollarni yuklab bo‘lmadi");
        }
      })
      .finally(() => active && setLoadingTables(false));
    return () => {
      active = false;
    };
  }, [form.date, form.time, form.guests, form.durationMinutes, revision, setForm]);
  const available = useMemo(() => tables.filter((t) => t.available), [tables]);
  const availabilityReady = Boolean(form.date && form.time);
  const selected = tables.find((t) => t.id === form.tableId && t.available);
  const fee = selected?.booking_fee || 0;
  const future = (time: string) => Date.parse(form.date + "T" + time + ":00+05:00") > Date.now();
  const submit = async (e) => {
    e.preventDefault();
    if (!future(form.time)) return toast.error("Kelajakdagi sana va vaqtni tanlang.");
    if (fee && (!receipt || !card.cardNumber)) return toast.error("To‘lov chekini yuklang.");
    if (!selected) return toast.error("Bo‘sh stolni tanlang");
    setSending(true);
    try {
      await createReservation({
        ...form,
        expectedFee: fee,
        guestKey: bookingGuestKey(),
        receipt: fee ? receipt : "",
        guests: Number(form.guests),
        durationMinutes: Number(form.durationMinutes),
      });
      setBookedTableName(selected.name);
      setReceipt("");
      setForm({ ...initial });
      toast.success("Bron so‘rovi yuborildi! Tez orada siz bilan bog‘lanamiz.");
    } catch (err) {
      toast.error(err.message || "Yuborib bo‘lmadi");
    } finally {
      setSending(false);
    }
  };
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="back-btn">
          <ArrowLeft size={17} aria-hidden="true" /> Xonqa O‘rinboy Hotdog
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Joy va stol band qilish</h1>
        <p className="mt-2 text-muted-foreground">
          Oddiy tashrif, tug‘ilgan kun yoki boshqa tadbir uchun joyni oldindan tanlang.
        </p>
        {bookedTableName ? (
          <div className="mt-8 rounded-3xl border border-t-4 border-t-primary bg-card p-5 shadow-sm sm:p-8">
            <p className="font-semibold">Bron so‘rovingiz qabul qilindi!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Stol: {bookedTableName}. Administrator siz bilan bog‘lanib tasdiqlaydi.
            </p>
            <Button className="mt-4" onClick={() => setBookedTableName(null)}>
              Yana bron qilish
            </Button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 grid gap-5 rounded-3xl border border-t-4 border-t-primary bg-card p-5 shadow-sm sm:p-8"
          >
            <div className="grid gap-2">
              <Label htmlFor="b-event">Tashrif turi</Label>
              <select
                id="b-event"
                className="h-10 rounded-md border bg-background px-3"
                value={form.eventType}
                onChange={(e) => set("eventType", e.target.value)}
              >
                {EVENTS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
            {form.eventType !== "regular" && (
              <div className="grid gap-2">
                <Label htmlFor="b-title">Tadbir nomi yoki qo‘shimcha ma’lumot</Label>
                <Input
                  id="b-title"
                  maxLength={100}
                  placeholder="Masalan, Aliyning tug‘ilgan kuni"
                  value={form.eventTitle}
                  onChange={(e) => set("eventTitle", e.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="b-name">Ismingiz</Label>
              <Input
                id="b-name"
                required
                minLength={2}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-phone">Telefon</Label>
              <Input
                id="b-phone"
                type="tel"
                required
                placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="b-date">Sana</Label>
                <Input
                  id="b-date"
                  type="date"
                  required
                  min={today()}
                  value={form.date}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      date: e.target.value,
                      time: "",
                      tableId: "",
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="b-time">Boshlanish vaqti</Label>
                <div className="flex gap-2">
                  {["Ertalab", "Kechki"].map((label) => (
                    <Button
                      key={label}
                      type="button"
                      aria-pressed={period === label}
                      variant={period === label ? "default" : "outline"}
                      onClick={() => {
                        setPeriod(label);
                        set("time", "");
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <select
                  id="b-time"
                  required
                  disabled={!form.date}
                  value={form.time}
                  onChange={(e) => set("time", e.target.value)}
                  className="h-11 rounded-xl border bg-background px-3"
                >
                  <option value="">Soatni tanlang</option>
                  {Array.from(
                    { length: 48 },
                    (_, i) =>
                      String(Math.floor(i / 4) + (period === "Kechki" ? 12 : 0)).padStart(2, "0") +
                      ":" +
                      String((i % 4) * 15).padStart(2, "0"),
                  ).map((time) => (
                    <option key={time} disabled={!future(time)}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="b-guests">Mehmonlar soni</Label>
                <Input
                  id="b-guests"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={form.guests}
                  onChange={(e) => set("guests", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="b-duration">Davomiyligi</Label>
                <select
                  id="b-duration"
                  className="h-10 rounded-md border bg-background px-3"
                  value={form.durationMinutes}
                  onChange={(e) => set("durationMinutes", e.target.value)}
                >
                  <option value="60">1 soat</option>
                  <option value="120">2 soat</option>
                  <option value="180">3 soat</option>
                  <option value="240">4 soat</option>
                  <option value="360">6 soat</option>
                  <option value="480">8 soat</option>
                </select>
              </div>
            </div>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Bo‘sh stollar</h2>
                  <p className="text-sm text-muted-foreground">
                    Sana, vaqt va mehmonlar soniga mos joylar
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">{available.length} ta bo‘sh</span>
              </div>
              {loadingTables ? (
                <div
                  role="status"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" /> Stollar tekshirilmoqda…
                </div>
              ) : !availabilityReady ? (
                <p className="text-sm text-muted-foreground">
                  Bo‘sh stollarni ko‘rish uchun avval sana va vaqtni tanlang.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      disabled={!availabilityReady || !table.available}
                      onClick={() => set("tableId", table.id)}
                      className={`rounded-2xl border p-4 text-left transition ${form.tableId === table.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"} ${!table.available ? "cursor-not-allowed opacity-45" : "hover:border-primary"}`}
                    >
                      {table.image_url && (
                        <img
                          src={table.image_url}
                          alt={table.name}
                          loading="lazy"
                          className="mb-3 h-28 w-full rounded-xl object-cover"
                        />
                      )}
                      <span className="flex items-center justify-between gap-2 font-medium">
                        {table.name}
                        <span
                          className={`text-xs ${table.available ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {table.available ? "Bo‘sh" : "Band / sig‘imi mos emas"}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {table.area} · {table.capacity} kishilik ·{" "}
                        {table.booking_fee ? table.booking_fee.toLocaleString() + " so‘m" : "Bepul"}
                      </span>
                    </button>
                  ))}
                  {tables.length > 0 && !available.length && (
                    <p role="status" className="wrap no-results">
                      Tanlangan vaqtda mos bo‘sh stol yo‘q. Boshqa vaqtni tanlang.
                    </p>
                  )}
                  {!tables.length && (
                    <p className="text-sm text-muted-foreground">
                      Hozircha stollar qo‘shilmagan. Iltimos, telefon orqali bog‘laning.
                    </p>
                  )}
                </div>
              )}
            </section>
            <div className="grid gap-2">
              <Label htmlFor="b-note">Qo‘shimcha talablar (ixtiyoriy)</Label>
              <Textarea
                id="b-note"
                maxLength={300}
                placeholder="Masalan, tort uchun joy, bezatish yoki boshqa istaklar"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>
            {selected && (
              <section className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                <h2 className="font-semibold">Bron to‘lovi</h2>
                <p>
                  {selected.name} · {fee ? fee.toLocaleString() + " so‘m" : "Bepul"}
                </p>
                {fee > 0 &&
                  (card.cardNumber ? (
                    <>
                      <p>Kartaga o‘tkazing va chekni biriktiring.</p>
                      <strong>{card.cardNumber}</strong>
                      <p>{card.cardOwner}</p>
                      <Label htmlFor="booking-receipt">Chekni yuklash (rasm yoki PDF)</Label>
                      <Input
                        id="booking-receipt"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={reading || sending}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          setReceipt("");
                          if (!file) return;
                          setReading(true);
                          try {
                            setReceipt(await readReceipt(file));
                          } catch (error) {
                            toast.error(error.message);
                          } finally {
                            setReading(false);
                          }
                        }}
                      />
                      <p role="status">
                        {reading ? "Chek yuklanmoqda…" : receipt ? "Chek biriktirildi" : ""}
                      </p>
                    </>
                  ) : (
                    <p>Karta rekvizitlari kiritilmagan. Administratorga murojaat qiling.</p>
                  ))}
              </section>
            )}
            <Button
              type="submit"
              disabled={
                sending ||
                reading ||
                loadingTables ||
                !availabilityReady ||
                !selected ||
                (fee > 0 && (!receipt || !card.cardNumber))
              }
            >
              {sending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {sending ? "Yuborilmoqda…" : "Joyni band qilish"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Bron administrator tasdiqlaganidan keyin yakuniy hisoblanadi.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
