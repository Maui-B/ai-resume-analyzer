-- 0004_jobs.sql
-- Jobs are posted by recruiters of a company. Public-read for status='open'.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  posted_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  location text,
  salary_min integer,
  salary_max integer,
  skills text[] not null default '{}',
  status text not null check (status in ('draft', 'open', 'paused', 'closed')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_id_idx on public.jobs(company_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function public.touch_updated_at();
