-- Per-user Passion daily / weekend timetable (private to auth.uid() via RLS).

create table if not exists public.passion_schedule (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  daily_json    jsonb not null default '[]'::jsonb,
  weekend_json  jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.passion_schedule enable row level security;

drop policy if exists passion_schedule_select on public.passion_schedule;
create policy passion_schedule_select on public.passion_schedule
  for select using (auth.uid() = user_id);

drop policy if exists passion_schedule_insert on public.passion_schedule;
create policy passion_schedule_insert on public.passion_schedule
  for insert with check (auth.uid() = user_id);

drop policy if exists passion_schedule_update on public.passion_schedule;
create policy passion_schedule_update on public.passion_schedule
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists passion_schedule_delete on public.passion_schedule;
create policy passion_schedule_delete on public.passion_schedule
  for delete using (auth.uid() = user_id);

