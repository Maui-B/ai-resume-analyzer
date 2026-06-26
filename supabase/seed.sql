-- supabase/seed.sql
-- Seed data for local dev. Run via `supabase db reset` after migrations.
-- Creates 2 demo auth users, 1 company, 4 jobs, 8 applications, 3 resumes.

-- =========================
-- 1. Demo auth users (via auth.users + auth.identities)
-- =========================
-- Pattern works for Supabase local stack. Password for ALL demo users: 'password123'

do $$
declare
  jobseeker_id uuid := '11111111-1111-1111-1111-111111111111';
  recruiter_id  uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- jobseeker
  if not exists (select 1 from auth.users where id = jobseeker_id) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      jobseeker_id, 'authenticated', 'authenticated',
      'jobseeker@demo.local',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Jobseeker"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at
    ) values (
      gen_random_uuid(),
      jobseeker_id,
      format('{"sub":"%s","email":"%s"}', jobseeker_id, 'jobseeker@demo.local')::jsonb,
      'email', 'jobseeker@demo.local', now(), now()
    );
  end if;

  -- recruiter
  if not exists (select 1 from auth.users where id = recruiter_id) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      recruiter_id, 'authenticated', 'authenticated',
      'recruiter@demo.local',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Recruiter"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at
    ) values (
      gen_random_uuid(),
      recruiter_id,
      format('{"sub":"%s","email":"%s"}', recruiter_id, 'recruiter@demo.local')::jsonb,
      'email', 'recruiter@demo.local', now(), now()
    );
  end if;
end $$;

-- =========================
-- 2. Profiles (the trigger already created them; just update)
-- =========================
update public.profiles set role = 'jobseeker', full_name = 'Demo Jobseeker'
  where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set role = 'recruiter', full_name = 'Demo Recruiter'
  where id = '22222222-2222-2222-2222-222222222222';

-- =========================
-- 3. Company + members
-- =========================
insert into public.companies (id, name, owner_id, website)
values (
  '33333333-3333-3333-3333-333333333333',
  'Acme Talent Co.',
  '22222222-2222-2222-2222-222222222222',
  'https://acme.example.com'
)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, member_role)
values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'owner')
on conflict do nothing;

-- link recruiter's profile to company
update public.profiles
  set company_id = '33333333-3333-3333-3333-333333333333'
  where id = '22222222-2222-2222-2222-222222222222';

-- =========================
-- 4. Resumes (sample, for the demo jobseeker)
-- =========================
insert into public.resumes (id, user_id, job_title, company_name, job_description, image_path, resume_path, feedback)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    'Senior Frontend Engineer',
    'Acme Talent Co.',
    'Looking for a senior frontend engineer with React experience.',
    null, null,
    '{"overallScore": 78, "ATS": {"score": 82, "tips": [{"type":"good","tip":"Strong React section"}]}, "toneAndStyle": {"score": 75, "tips": []}, "content": {"score": 80, "tips": []}, "structure": {"score": 76, "tips": []}, "skills": {"score": 79, "tips": []}}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111111',
    'Full-Stack Developer',
    'BetaWorks',
    'Full-stack role; React + Node + Postgres.',
    null, null,
    '{"overallScore": 71, "ATS": {"score": 70, "tips": []}, "toneAndStyle": {"score": 72, "tips": []}, "content": {"score": 70, "tips": []}, "structure": {"score": 73, "tips": []}, "skills": {"score": 70, "tips": []}}'::jsonb
  )
on conflict (id) do nothing;

-- =========================
-- 5. Jobs
-- =========================
insert into public.jobs (id, company_id, posted_by, title, description, location, salary_min, salary_max, skills, status)
values
  (
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Senior Frontend Engineer',
    'Build the next generation of recruiter tooling. React, TypeScript, Supabase.',
    'Remote (SA)',
    600000, 900000,
    array['React','TypeScript','Supabase','Tailwind'],
    'open'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Full-Stack Developer',
    'Own features end to end. Node, Postgres, edge functions.',
    'Cape Town',
    550000, 850000,
    array['Node','Postgres','React'],
    'open'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'DevOps Engineer',
    'Kubernetes, Terraform, CI/CD pipelines.',
    'Remote',
    700000, 1100000,
    array['K8s','Terraform','AWS'],
    'paused'
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Engineering Manager',
    'Lead a team of 6 engineers. IC background required.',
    'Johannesburg',
    1200000, 1800000,
    array['Leadership','Coaching'],
    'closed'
  )
on conflict (id) do nothing;

-- =========================
-- 6. Applications
-- =========================
insert into public.applications (job_id, jobseeker_id, resume_id, status, match_score, notes)
values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444441', 'shortlisted', 84, 'Strong React + TypeScript match.'),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444442', 'reviewed', 72, null),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444442', 'submitted', 68, null)
on conflict (job_id, jobseeker_id) do nothing;

-- =========================
-- 7. Mark seeded
-- =========================
insert into public.mock_seeded (id, seed_version)
values (true, 1)
on conflict (id) do update set seeded_at = now(), seed_version = excluded.seed_version;
