-- Bo‘sh Supabase loyihasi uchun schema. Hech qanday demo mahsulot, kategoriya, aksiya, stol yoki buyurtma yaratilmaydi.
-- Supabase SQL Editor ga to‘liq nusxalab Run bosing.
CREATE TABLE IF NOT EXISTS public.categories (id text PRIMARY KEY, data jsonb NOT NULL, sort int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.products (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.promotions (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;
CREATE TABLE IF NOT EXISTS public.orders (id text PRIMARY KEY DEFAULT nextval('public.order_number_seq')::text, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS public.admin_sessions (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.categories, public.products, public.promotions, public.orders, public.app_settings, public.admin_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
-- Mijoz profillari va savat (har bir foydalanuvchi uchun alohida). Qayta ishga tushirish xavfsiz.
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text CHECK (char_length(full_name) <= 100),
  phone text CHECK (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  birthday date CHECK (birthday > '1900-01-01' AND birthday <= current_date),
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  font_size text NOT NULL DEFAULT 'normal' CHECK (font_size IN ('small','normal','large')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cart_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  qty int NOT NULL CHECK (qty > 0 AND qty <= 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.cart_items TO authenticated;
GRANT ALL ON public.profiles, public.cart_items TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own cart" ON public.cart_items;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- To‘lov cheklari private Supabase Storage’da saqlanadi.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-receipts', 'order-receipts', false, 9437184, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 9437184, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];

-- v4.5.4: buyurtma statuslari alohida jadvalda (real-time uchun, shaxsiy ma'lumotsiz)
CREATE TABLE IF NOT EXISTS public.order_status (id text PRIMARY KEY, status text NOT NULL DEFAULT 'new', cancel_reason text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.order_status ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_status TO anon, authenticated;
GRANT ALL ON public.order_status TO service_role;
DROP POLICY IF EXISTS "order_status public read" ON public.order_status;
CREATE POLICY "order_status public read" ON public.order_status FOR SELECT TO anon, authenticated USING (true);
CREATE OR REPLACE FUNCTION public.sync_order_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_status (id, status, cancel_reason, updated_at)
  VALUES (NEW.id, COALESCE(NEW.data->>'status','new'), COALESCE(NEW.data->>'cancelReason',''), now())
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, cancel_reason = EXCLUDED.cancel_reason, updated_at = now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_sync_status ON public.orders;
CREATE TRIGGER orders_sync_status AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_status();
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  guests int NOT NULL CHECK (guests BETWEEN 1 AND 30),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','cancelled','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reservations FROM anon, authenticated;
GRANT ALL ON public.reservations TO service_role;


-- Venue tables and event-aware reservation migration
-- Venue table inventory and event-aware reservations.
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_guests_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_guests_check CHECK (guests BETWEEN 1 AND 100);
CREATE TABLE IF NOT EXISTS public.venue_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 100),
  area text NOT NULL DEFAULT 'Asosiy zal',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_tables FROM anon, authenticated;
GRANT ALL ON public.venue_tables TO service_role;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.venue_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS event_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 120;

DO $$ BEGIN
  ALTER TABLE public.reservations ADD CONSTRAINT reservations_event_type_check
    CHECK (event_type IN ('regular','birthday','celebration','business','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.reservations ADD CONSTRAINT reservations_duration_check
    CHECK (duration_minutes BETWEEN 30 AND 600);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS reservations_date_table_idx
  ON public.reservations(date, table_id, time)
  WHERE status IN ('new','confirmed');
CREATE INDEX IF NOT EXISTS venue_tables_active_idx ON public.venue_tables(active);

-- Enforce non-overlapping bookings with a trigger-maintained range.
-- A trigger is used because casting the text time column is not IMMUTABLE,
-- so PostgreSQL does not allow it inside a generated column expression.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_table_no_overlap;
DROP TRIGGER IF EXISTS reservations_set_slot_range ON public.reservations;
ALTER TABLE public.reservations DROP COLUMN IF EXISTS slot_range;
ALTER TABLE public.reservations ADD COLUMN slot_range tsrange;
CREATE OR REPLACE FUNCTION public.set_reservation_slot_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.table_id IS NULL THEN
    NEW.slot_range := NULL;
  ELSE
    NEW.slot_range := tsrange(
      NEW.date + NEW.time::time,
      NEW.date + NEW.time::time + make_interval(mins => NEW.duration_minutes),
      '[)'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reservations_set_slot_range
BEFORE INSERT OR UPDATE OF date, time, duration_minutes, table_id
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_reservation_slot_range();
UPDATE public.reservations SET date = date WHERE table_id IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.reservations ADD CONSTRAINT reservations_table_no_overlap
    EXCLUDE USING gist (table_id WITH =, slot_range WITH &&)
    WHERE (table_id IS NOT NULL AND status IN ('new','confirmed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table public.orders add column if not exists notification_owner text;
alter table public.reservations add column if not exists notification_owner text;
create table if not exists public.customer_status_events (
  id bigint generated always as identity primary key,
  owner_key text not null,
  kind text not null,
  reference text not null,
  status text not null,
  reason text
);
alter table public.customer_status_events enable row level security;
revoke all on public.customer_status_events from public, anon, authenticated;
grant select, insert on public.customer_status_events to service_role;
grant usage on sequence public.customer_status_events_id_seq to service_role;
create index if not exists customer_status_feed on public.customer_status_events(owner_key,id);
create or replace function public.record_customer_status() returns trigger
language plpgsql set search_path = '' as $$
declare
  current_status text;
  previous_status text;
  reason text;
begin
  if new.notification_owner is null then return new; end if;
  if tg_table_name = 'orders' then
    current_status := new.data->>'status';
    reason := new.data->>'cancelReason';
    if tg_op = 'UPDATE' and old.notification_owner is not null then previous_status := old.data->>'status'; end if;
  else
    current_status := new.status;
    if tg_op = 'UPDATE' then previous_status := old.status; end if;
  end if;
  if current_status is distinct from previous_status then
    perform pg_advisory_xact_lock(hashtextextended(new.notification_owner, 0));
    insert into public.customer_status_events(owner_key,kind,reference,status,reason)
      values(new.notification_owner,tg_table_name,new.id::text,current_status,reason);
  end if;
  return new;
end $$;
drop trigger if exists notify_order_customer on public.orders;
create trigger notify_order_customer after insert or update on public.orders
for each row execute function public.record_customer_status();
drop trigger if exists notify_reservation_customer on public.reservations;
create trigger notify_reservation_customer after insert or update on public.reservations
for each row execute function public.record_customer_status();

-- Older installations exposed cancellation reasons in a public mirror.
do $$ begin
  if to_regclass('public.order_status') is not null then
    revoke select on public.order_status from anon, authenticated, public;
    drop policy if exists "order_status public read" on public.order_status;
  end if;
end $$;
