-- =====================================================================
-- RedOrHen — prezzi del Listino modificabili dall'area admin (scheda Listino)
-- Da eseguire una volta in Supabase → SQL Editor → New query → Run
-- (è già compreso in setup.sql per le installazioni nuove)
-- =====================================================================

create table if not exists public.price_items (
  key         text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  price       numeric(8, 2) check (price >= 0),   -- vuoto = "Da concordare"
  suffix      text check (char_length(suffix) <= 40),
  updated_at  timestamptz not null default now()
);

-- Il sito pubblico legge i prezzi; solo tu, dopo il login, puoi modificarli.
alter table public.price_items enable row level security;

drop policy if exists "price_items_read" on public.price_items;
drop policy if exists "price_items_insert_own" on public.price_items;
drop policy if exists "price_items_update_own" on public.price_items;
drop policy if exists "price_items_delete_own" on public.price_items;

create policy "price_items_read" on public.price_items
  for select to anon, authenticated using (true);

create policy "price_items_insert_own" on public.price_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "price_items_update_own" on public.price_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "price_items_delete_own" on public.price_items
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.price_items to anon;

drop trigger if exists price_items_updated_at on public.price_items;
create trigger price_items_updated_at
  before update on public.price_items
  for each row execute function public.appointments_set_updated_at();

-- Prezzi di partenza (quelli attuali del Listino), assegnati al primo utente admin
insert into public.price_items (key, user_id, price, suffix)
select v.key, u.id, v.price, v.suffix
from (values
  ('lv1', 50, null),
  ('lv2', 150, null),
  ('lv3_2', 60, null),
  ('lv3_3', 80, null),
  ('extra_foto', 5, '/ foto'),
  ('extra_trasferta', 0, null),
  ('extra_evento', 15, '· 3 foto')
) as v (key, price, suffix)
cross join (select id from auth.users order by created_at limit 1) as u
on conflict (key) do nothing;
