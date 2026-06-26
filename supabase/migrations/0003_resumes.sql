-- 0003_resumes.sql
-- Resumes belong to a jobseeker. Linked to a job context (title + description)
-- the resume was analysed against.

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text,
  company_name text,
  job_description text,
  image_path text,    -- storage path for rendered preview PNG
  resume_path text,   -- storage path for original PDF
  feedback jsonb,     -- AIResponse shape — see types/index.d.ts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_created_at_idx on public.resumes(created_at desc);

drop trigger if exists resumes_touch_updated_at on public.resumes;
create trigger resumes_touch_updated_at
  before update on public.resumes
  for each row execute function public.touch_updated_at();
