-- =====================================================================
-- Contatore visite del sito (senza cookie e senza dati personali)
-- Esegui questo file nel SQL Editor di Supabase, una volta sola.
-- Chiunque può SCRIVERE una riga (le visite), solo chi ha fatto il login
-- nell'area admin può LEGGERLE.
-- =====================================================================

create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page       text not null check (char_length(page) <= 80),
  kind       text not null default 'view' check (kind in ('view', 'click', 'submit')),
  label      text check (char_length(label) <= 60),
  source     text check (char_length(source) <= 40),
  medium     text check (char_length(medium) <= 40),
  campaign   text check (char_length(campaign) <= 60),
  referrer   text check (char_length(referrer) <= 80)
);

create index if not exists page_views_created_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

drop policy if exists "page_views_insert" on public.page_views;
drop policy if exists "page_views_read" on public.page_views;

create policy "page_views_insert" on public.page_views
  for insert to anon, authenticated with check (true);

create policy "page_views_read" on public.page_views
  for select to authenticated using (true);
