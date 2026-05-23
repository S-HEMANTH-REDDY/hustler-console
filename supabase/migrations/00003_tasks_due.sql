-- Add per-task due date + due time so Today/Tomorrow/Yesterday tabs and the
-- countdown clock on the Today card have a real schedule to work against.
-- Idempotent: safe to re-run.

alter table public.tasks
  add column if not exists due_date date,
  add column if not exists due_time text;

create index if not exists tasks_user_due_idx
  on public.tasks(user_id, due_date);
