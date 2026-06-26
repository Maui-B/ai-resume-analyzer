-- 0005_applications.sql
-- A jobseeker applies to a job with one of their resumes. Recruiters
-- of the job's company can review / change status.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  jobseeker_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  status text not null check (
    status in (
      'submitted', 'reviewed', 'shortlisted',
      'interviewing', 'rejected', 'hired'
    )
  ) default 'submitted',
  match_score integer,
  match_feedback jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, jobseeker_id)
);

create index if not exists applications_jobseeker_id_idx on public.applications(jobseeker_id);
create index if not exists applications_job_id_idx on public.applications(job_id);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_match_score_idx on public.applications(match_score desc);

drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at
  before update on public.applications
  for each row execute function public.touch_updated_at();
