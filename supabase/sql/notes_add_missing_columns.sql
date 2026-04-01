-- Run once in Supabase: Dashboard → SQL Editor → New query → Run
-- Aligns table public.notes with the app (handwriting + starred).

alter table public.notes
  add column if not exists handwriting_data text;

alter table public.notes
  add column if not exists is_starred boolean default false;

-- Optional: backfill nulls if is_starred existed without default
update public.notes set is_starred = false where is_starred is null;
