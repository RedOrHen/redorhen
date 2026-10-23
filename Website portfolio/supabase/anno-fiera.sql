-- =====================================================================
-- RedOrHen — campi Anno e Fiera dei set della galleria
-- Da eseguire una volta in Supabase → SQL Editor → New query → Run
-- (è già compreso in setup.sql per le installazioni nuove)
-- =====================================================================

alter table public.gallery_sets add column if not exists year smallint;
alter table public.gallery_sets add column if not exists fair text;

alter table public.gallery_sets drop constraint if exists gallery_sets_year_range;
alter table public.gallery_sets add constraint gallery_sets_year_range check (year is null or year between 1990 and 2100);

alter table public.gallery_sets drop constraint if exists gallery_sets_fair_length;
alter table public.gallery_sets add constraint gallery_sets_fair_length check (fair is null or char_length(fair) <= 120);

-- Aggiorna subito l'elenco delle colonne visto dalle API (altrimenti servono alcuni secondi)
notify pgrst, 'reload schema';
