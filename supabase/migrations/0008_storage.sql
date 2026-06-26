-- 0008_storage.sql
-- Storage buckets + RLS-style policies on storage.objects.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('resumes', 'resumes', false, 52428800),
  ('resume-previews', 'resume-previews', false, 5242880)
on conflict (id) do nothing;

-- Path convention: {user_id}/{filename}
-- Owners can read/write their own folder.

-- resumes bucket policies
drop policy if exists "resumes_owner_select" on storage.objects;
create policy "resumes_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "resumes_owner_insert" on storage.objects;
create policy "resumes_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "resumes_owner_update" on storage.objects;
create policy "resumes_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "resumes_owner_delete" on storage.objects;
create policy "resumes_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- resume-previews bucket policies (same shape)
drop policy if exists "previews_owner_select" on storage.objects;
create policy "previews_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resume-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "previews_owner_insert" on storage.objects;
create policy "previews_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resume-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "previews_owner_update" on storage.objects;
create policy "previews_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resume-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'resume-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "previews_owner_delete" on storage.objects;
create policy "previews_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resume-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Recruiters with access to an Application can read the resume + preview too.
drop policy if exists "resumes_recruiter_select" on storage.objects;
create policy "resumes_recruiter_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('resumes', 'resume-previews')
    and exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.resumes r on r.id = a.resume_id
      where (name = r.resume_path or name = r.image_path)
        and public.is_company_recruiter(j.company_id, auth.uid())
    )
  );
