-- =====================================================================
-- RedOrHen — sconti a tempo per il Listino (scheda "Sconti" dell'area admin)
-- Da eseguire una volta in Supabase → SQL Editor → New query → Run
-- (è già compreso in setup.sql per le installazioni nuove)
-- =====================================================================

create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text check (char_length(label) <= 120),
  kind        text not null default 'percent' check (kind in ('percent', 'euro')),
  amount      numeric(8, 2) not null check (amount > 0),
  starts_on   date not null,
  ends_on     date not null,
  plans       text[] not null default array['lv1', 'lv2', 'lv3'],
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint promotions_dates check (ends_on >= starts_on),
  constraint promotions_percent check (kind <> 'percent' or amount < 100)
);

-- Il sito pubblico legge solo gli sconti attivi nel periodo (con un giorno di margine
-- per i fusi orari: il controllo esatto sulla data lo fa la pagina);
-- solo tu, dopo il login, puoi vederli tutti, crearli, modificarli ed eliminarli.
alter table public.promotions enable row level security;

drop policy if exists "promotions_read" on public.promotions;
drop policy if exists "promotions_insert_own" on public.promotions;
drop policy if exists "promotions_update_own" on public.promotions;
drop policy if exists "promotions_delete_own" on public.promotions;

create policy "promotions_read" on public.promotions
  for select to anon, authenticated
  using (
    (active and current_date between starts_on - 1 and ends_on + 1)
    or (select auth.uid()) = user_id
  );

create policy "promotions_insert_own" on public.promotions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "promotions_update_own" on public.promotions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "promotions_delete_own" on public.promotions
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.promotions to anon;

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at
  before update on public.promotions
  for each row execute function public.appointments_set_updated_at();
