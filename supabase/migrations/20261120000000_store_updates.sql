-- Send only an invalidation signal. Each client reloads through its existing API.
create or replace function public.signal_store_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'store-updates', false);
  return null;
end;
$$;
revoke all on function public.signal_store_update() from public;
do $$
declare tab text;
begin
  foreach tab in array array['products','categories','promotions','reservations','venue_tables','orders','app_settings'] loop
    execute format('drop trigger if exists signal_store_update on public.%I', tab);
    execute format('create trigger signal_store_update after insert or update or delete on public.%I for each statement execute function public.signal_store_update()', tab);
  end loop;
end;
$$;
