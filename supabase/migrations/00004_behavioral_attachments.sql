-- Per-user behavioral study guide uploads (PDF/DOC metadata; bytes in `passion` bucket).
-- Idempotent: safe to re-run.

create table if not exists public.behavioral_attachments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  file_type     text not null,
  file_size     bigint not null check (file_size >= 0),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

create index if not exists behavioral_att_user_created_idx
  on public.behavioral_attachments(user_id, created_at desc);

alter table public.behavioral_attachments enable row level security;

drop policy if exists behavioral_attachments_select on public.behavioral_attachments;
create policy behavioral_attachments_select on public.behavioral_attachments
  for select using (auth.uid() = user_id);

drop policy if exists behavioral_attachments_insert on public.behavioral_attachments;
create policy behavioral_attachments_insert on public.behavioral_attachments
  for insert with check (auth.uid() = user_id);

drop policy if exists behavioral_attachments_update on public.behavioral_attachments;
create policy behavioral_attachments_update on public.behavioral_attachments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists behavioral_attachments_delete on public.behavioral_attachments;
create policy behavioral_attachments_delete on public.behavioral_attachments
  for delete using (auth.uid() = user_id);
