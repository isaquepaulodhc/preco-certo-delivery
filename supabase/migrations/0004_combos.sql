alter table public.combos
  add column if not exists category text,
  add column if not exists description text;
