-- Hustler · phase 1 initial schema
--
-- Mirrors the Dexie tables (applications, dsa_problems,
-- system_design_problems, behavioral_stories, tasks, passion_ideas,
-- resume_files, passion_attachments) into Postgres with strict per-user
-- row-level security. File bytes live in the `resumes` and `passion`
-- Storage buckets; only metadata lives in the database.
--
-- Run this once via the Supabase SQL Editor (Dashboard → SQL → New query),
-- or via `supabase db push` if you're using the CLI. It is idempotent and
-- safe to re-run.

set check_function_bodies = off;

-- =====================================================================
--  Profiles (one row per auth.user, auto-created on signup)
-- =====================================================================
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  Settings (one row per user — APS quota window etc.)
-- =====================================================================
create table if not exists public.settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  daily_min     int  not null default 30 check (daily_min  > 0),
  daily_max     int  not null default 50 check (daily_max >= daily_min),
  window_start  text not null default '00:00',
  window_end    text not null default '23:59',
  updated_at    timestamptz not null default now()
);

-- =====================================================================
--  Resume files (metadata only; bytes live in storage bucket 'resumes')
-- =====================================================================
create table if not exists public.resume_files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  file_type     text not null,
  file_size     bigint not null check (file_size >= 0),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists resume_files_user_created_idx
  on public.resume_files(user_id, created_at desc);

-- =====================================================================
--  Applications (APS)
-- =====================================================================
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  company         text not null,
  role            text not null,
  source          text not null default 'Other',
  resume_version  text not null default 'default',
  resume_file_id  uuid references public.resume_files(id) on delete set null,
  status          text not null default 'Applied',
  priority        text not null default 'mid',
  created_at      timestamptz not null default now()
);
create index if not exists applications_user_date_idx
  on public.applications(user_id, date desc);
create index if not exists applications_user_status_idx
  on public.applications(user_id, status);

-- =====================================================================
--  DSA problems
-- =====================================================================
create table if not exists public.dsa_problems (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  title       text not null,
  topic       text not null,
  difficulty  text not null,
  confidence  int  not null check (confidence between 1 and 5),
  minutes     int  not null default 0 check (minutes >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists dsa_user_date_idx on public.dsa_problems(user_id, date desc);

-- =====================================================================
--  System design problems
-- =====================================================================
create table if not exists public.system_design_problems (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  title       text not null,
  kind        text not null default 'hld' check (kind in ('hld', 'lld')),
  topic       text not null,
  difficulty  text not null,
  confidence  int  not null check (confidence between 1 and 5),
  minutes     int  not null default 0 check (minutes >= 0),
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists sysd_user_date_idx
  on public.system_design_problems(user_id, date desc);

-- =====================================================================
--  Behavioral stories
-- =====================================================================
create table if not exists public.behavioral_stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  category    text not null,
  status      text not null default 'draft',
  confidence  int  not null check (confidence between 1 and 5),
  situation   text not null default '',
  task        text not null default '',
  action      text not null default '',
  result      text not null default '',
  updated_at  timestamptz not null default now()
);
create index if not exists beh_user_category_idx
  on public.behavioral_stories(user_id, category);

-- =====================================================================
--  Life tasks
-- =====================================================================
create table if not exists public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null,
  priority           text not null default 'mid',
  recurrence         text not null default 'oneoff',
  last_completed_at  date,
  created_at         timestamptz not null default now()
);
create index if not exists tasks_user_priority_idx
  on public.tasks(user_id, priority);

-- =====================================================================
--  Passion attachments (metadata only; bytes in 'passion' bucket)
-- =====================================================================
create table if not exists public.passion_attachments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  file_type     text not null,
  file_size     bigint not null check (file_size >= 0),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists passion_att_user_created_idx
  on public.passion_attachments(user_id, created_at desc);

-- =====================================================================
--  Passion ideas
-- =====================================================================
create table if not exists public.passion_ideas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  title                text not null default 'Untitled idea',
  tag                  text not null default 'idea',
  notes                text not null default '',
  links                jsonb not null default '[]'::jsonb,
  attachment_ids       uuid[] not null default '{}'::uuid[],
  think_minutes        int  not null default 45 check (think_minutes between 1 and 240),
  think_minutes_total  int  not null default 0 check (think_minutes_total >= 0),
  sessions_completed   int  not null default 0 check (sessions_completed >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists passion_ideas_user_updated_idx
  on public.passion_ideas(user_id, updated_at desc);

-- =====================================================================
--  Row-level security
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.settings              enable row level security;
alter table public.resume_files          enable row level security;
alter table public.applications          enable row level security;
alter table public.dsa_problems          enable row level security;
alter table public.system_design_problems enable row level security;
alter table public.behavioral_stories    enable row level security;
alter table public.tasks                 enable row level security;
alter table public.passion_attachments   enable row level security;
alter table public.passion_ideas         enable row level security;

-- Generate the standard "row owner only" policies for every table in one shot.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles', 'settings', 'resume_files', 'applications',
    'dsa_problems', 'system_design_problems', 'behavioral_stories',
    'tasks', 'passion_attachments', 'passion_ideas'
  ] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', tbl);
    execute format(
      'create policy %1$s_select on public.%1$s for select using (auth.uid() = user_id)',
      tbl
    );

    execute format('drop policy if exists %1$s_insert on public.%1$s', tbl);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert with check (auth.uid() = user_id)',
      tbl
    );

    execute format('drop policy if exists %1$s_update on public.%1$s', tbl);
    execute format(
      'create policy %1$s_update on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl
    );

    execute format('drop policy if exists %1$s_delete on public.%1$s', tbl);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete using (auth.uid() = user_id)',
      tbl
    );
  end loop;
end$$;

-- =====================================================================
--  Storage buckets (private; ACL via storage.objects policies below)
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('resumes', 'resumes', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('passion', 'passion', false)
  on conflict (id) do nothing;

-- Owner check: the first path segment of the object name must equal the
-- current user's id, e.g. `resumes/<uid>/<uuid>.pdf`.
drop policy if exists resumes_read_own on storage.objects;
create policy resumes_read_own on storage.objects for select using (
  bucket_id = 'resumes' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists resumes_insert_own on storage.objects;
create policy resumes_insert_own on storage.objects for insert with check (
  bucket_id = 'resumes' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists resumes_update_own on storage.objects;
create policy resumes_update_own on storage.objects for update using (
  bucket_id = 'resumes' and auth.uid()::text = split_part(name, '/', 1)
) with check (
  bucket_id = 'resumes' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists resumes_delete_own on storage.objects;
create policy resumes_delete_own on storage.objects for delete using (
  bucket_id = 'resumes' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists passion_read_own on storage.objects;
create policy passion_read_own on storage.objects for select using (
  bucket_id = 'passion' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists passion_insert_own on storage.objects;
create policy passion_insert_own on storage.objects for insert with check (
  bucket_id = 'passion' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists passion_update_own on storage.objects;
create policy passion_update_own on storage.objects for update using (
  bucket_id = 'passion' and auth.uid()::text = split_part(name, '/', 1)
) with check (
  bucket_id = 'passion' and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists passion_delete_own on storage.objects;
create policy passion_delete_own on storage.objects for delete using (
  bucket_id = 'passion' and auth.uid()::text = split_part(name, '/', 1)
);
