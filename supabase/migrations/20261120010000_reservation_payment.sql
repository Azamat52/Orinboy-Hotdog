alter table public.venue_tables
  add column if not exists booking_fee integer not null default 0 check (booking_fee >= 0),
  add column if not exists image_url text not null default '';
alter table public.reservations
  add column if not exists booking_fee integer not null default 0 check (booking_fee >= 0),
  add column if not exists receipt_path text;
create or replace function public.check_booking_terms() returns trigger language plpgsql set search_path = public as $$
declare venue public.venue_tables%rowtype;
begin
  select * into strict venue from public.venue_tables where id=new.table_id for share;
  if not venue.active or venue.capacity < new.guests then raise exception 'Stol yopiq yoki sig‘imi yetarli emas'; end if;
  if new.date + new.time::time <= timezone('Asia/Tashkent',now()) then raise exception 'Kelajakdagi vaqtni tanlang'; end if;
  if venue.booking_fee <> new.booking_fee then raise exception 'Stol narxi o‘zgardi'; end if;
  if new.booking_fee > 0 and new.receipt_path is null then raise exception 'To‘lov cheki kerak'; end if;
  return new;
end; $$;
drop trigger if exists check_booking_terms on public.reservations;
create trigger check_booking_terms before insert on public.reservations for each row execute function public.check_booking_terms();
