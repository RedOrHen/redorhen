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
