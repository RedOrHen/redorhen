-- =====================================================================
-- RedOrHen — tabella appuntamenti per l'area admin
-- Da eseguire una volta in Supabase → SQL Editor → New query → Run
-- =====================================================================

create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  all_day     boolean not null default false,
  category    text not null default 'shooting',
  location    text,
  client      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint appointments_time_order check (end_at > start_at)
);

create index if not exists appointments_user_start_idx
  on public.appointments (user_id, start_at);

-- Row Level Security: ogni utente vede e modifica SOLO i propri appuntamenti.
-- Chi non ha fatto login (ruolo "anon") non può leggere né scrivere nulla.
alter table public.appointments enable row level security;

drop policy if exists "appointments_select_own" on public.appointments;
drop policy if exists "appointments_insert_own" on public.appointments;
drop policy if exists "appointments_update_own" on public.appointments;
drop policy if exists "appointments_delete_own" on public.appointments;

create policy "appointments_select_own" on public.appointments
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "appointments_insert_own" on public.appointments
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "appointments_update_own" on public.appointments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "appointments_delete_own" on public.appointments
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.appointments from anon;

-- Aggiorna automaticamente updated_at a ogni modifica
create or replace function public.appointments_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.appointments_set_updated_at();


-- =====================================================================
-- Galleria: set di foto della pagina Lavori (gestiti dall'area admin)
-- =====================================================================

create table if not exists public.gallery_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  character   text not null check (char_length(character) between 1 and 200),
  series      text,
  category    text,
  cosplayer   text,
  featured    boolean not null default false,
  published   boolean not null default true,
  position    integer not null default 0,
  photos      jsonb not null default '[]'::jsonb,  -- [{ "path": "...", "w": 1600, "h": 2400, "alt": "..." }]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists gallery_sets_position_idx on public.gallery_sets (position);

-- Chiunque può LEGGERE i set pubblicati (servono al sito pubblico) e quelli con la foto Hero/Contatti;
-- solo tu, dopo il login, puoi crearli, modificarli ed eliminarli.
alter table public.gallery_sets enable row level security;

drop policy if exists "gallery_sets_read" on public.gallery_sets;
drop policy if exists "gallery_sets_insert_own" on public.gallery_sets;
drop policy if exists "gallery_sets_update_own" on public.gallery_sets;
drop policy if exists "gallery_sets_delete_own" on public.gallery_sets;

-- Si leggono anche i set non pubblicati che contengono la foto scelta come Hero o Contatti:
-- non compaiono nei Lavori, ma il sito deve poter mostrare quella foto.
create policy "gallery_sets_read" on public.gallery_sets
  for select to anon, authenticated
  using (
    published
    or photos @> '[{"hero": true}]'::jsonb
    or photos @> '[{"contact": true}]'::jsonb
    or (select auth.uid()) = user_id
  );

create policy "gallery_sets_insert_own" on public.gallery_sets
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "gallery_sets_update_own" on public.gallery_sets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "gallery_sets_delete_own" on public.gallery_sets
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.gallery_sets to anon;

drop trigger if exists gallery_sets_updated_at on public.gallery_sets;
create trigger gallery_sets_updated_at
  before update on public.gallery_sets
  for each row execute function public.appointments_set_updated_at();

-- Spazio per le foto: lettura pubblica, caricamento e cancellazione solo dopo il login
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 20971520, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists "gallery_files_select" on storage.objects;
drop policy if exists "gallery_files_insert" on storage.objects;
drop policy if exists "gallery_files_update" on storage.objects;
drop policy if exists "gallery_files_delete" on storage.objects;

create policy "gallery_files_select" on storage.objects
  for select to authenticated using (bucket_id = 'gallery');

create policy "gallery_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'gallery');

create policy "gallery_files_update" on storage.objects
  for update to authenticated using (bucket_id = 'gallery') with check (bucket_id = 'gallery');

create policy "gallery_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'gallery');
