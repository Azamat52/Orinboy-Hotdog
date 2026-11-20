-- Venue table inventory and event-aware reservations.
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

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_guests_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_guests_check CHECK (guests BETWEEN 1 AND 100);

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
