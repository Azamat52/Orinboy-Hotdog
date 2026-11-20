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
