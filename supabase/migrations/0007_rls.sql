-- 0007_rls.sql
-- Row Level Security policies for all public tables.
-- Strategy: restrictive by default. Service role bypasses RLS for backend work.

-- =========================
-- profiles
-- =========================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_company_members" on public.profiles;
create policy "profiles_select_company_members"
  on public.profiles for select
  to authenticated
  using (
    company_id is not null
    and public.is_company_member(company_id, auth.uid())
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- =========================
-- companies
-- =========================
alter table public.companies enable row level security;

drop policy if exists "companies_select_members" on public.companies;
create policy "companies_select_members"
  on public.companies for select
  to authenticated
  using (public.is_company_member(id, auth.uid()));

drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_insert_authenticated"
  on public.companies for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "companies_update_owner" on public.companies;
create policy "companies_update_owner"
  on public.companies for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "companies_delete_owner" on public.companies;
create policy "companies_delete_owner"
  on public.companies for delete
  to authenticated
  using (owner_id = auth.uid());

-- =========================
-- company_members
-- =========================
alter table public.company_members enable row level security;

drop policy if exists "company_members_select_own" on public.company_members;
create policy "company_members_select_own"
  on public.company_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "company_members_select_owner" on public.company_members;
create policy "company_members_select_owner"
  on public.company_members for select
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "company_members_insert_owner" on public.company_members;
create policy "company_members_insert_owner"
  on public.company_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "company_members_delete_owner" on public.company_members;
create policy "company_members_delete_owner"
  on public.company_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

-- =========================
-- resumes
-- =========================
alter table public.resumes enable row level security;

drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "resumes_select_via_application" on public.resumes;
create policy "resumes_select_via_application"
  on public.resumes for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.resume_id = resumes.id
        and public.is_company_recruiter(j.company_id, auth.uid())
    )
  );

drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
  on public.resumes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own"
  on public.resumes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own"
  on public.resumes for delete
  to authenticated
  using (user_id = auth.uid());

-- =========================
-- jobs
-- =========================
alter table public.jobs enable row level security;

drop policy if exists "jobs_select_open_public" on public.jobs;
create policy "jobs_select_open_public"
  on public.jobs for select
  to anon, authenticated
  using (status = 'open');

drop policy if exists "jobs_select_members" on public.jobs;
create policy "jobs_select_members"
  on public.jobs for select
  to authenticated
  using (public.is_company_recruiter(company_id, auth.uid()));

drop policy if exists "jobs_insert_recruiter" on public.jobs;
create policy "jobs_insert_recruiter"
  on public.jobs for insert
  to authenticated
  with check (
    posted_by = auth.uid()
    and public.is_company_recruiter(company_id, auth.uid())
  );

drop policy if exists "jobs_update_recruiter" on public.jobs;
create policy "jobs_update_recruiter"
  on public.jobs for update
  to authenticated
  using (public.is_company_recruiter(company_id, auth.uid()))
  with check (public.is_company_recruiter(company_id, auth.uid()));

drop policy if exists "jobs_delete_recruiter" on public.jobs;
create policy "jobs_delete_recruiter"
  on public.jobs for delete
  to authenticated
  using (public.is_company_recruiter(company_id, auth.uid()));

-- =========================
-- applications
-- =========================
alter table public.applications enable row level security;

drop policy if exists "applications_select_jobseeker" on public.applications;
create policy "applications_select_jobseeker"
  on public.applications for select
  to authenticated
  using (jobseeker_id = auth.uid());

drop policy if exists "applications_select_recruiter" on public.applications;
create policy "applications_select_recruiter"
  on public.applications for select
  to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and public.is_company_recruiter(j.company_id, auth.uid())
    )
  );

drop policy if exists "applications_insert_jobseeker" on public.applications;
create policy "applications_insert_jobseeker"
  on public.applications for insert
  to authenticated
  with check (
    jobseeker_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'jobseeker'
    )
  );

drop policy if exists "applications_update_recruiter" on public.applications;
create policy "applications_update_recruiter"
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and public.is_company_recruiter(j.company_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and public.is_company_recruiter(j.company_id, auth.uid())
    )
  );

drop policy if exists "applications_delete_jobseeker" on public.applications;
create policy "applications_delete_jobseeker"
  on public.applications for delete
  to authenticated
  using (jobseeker_id = auth.uid());
