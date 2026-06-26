-- 0002_companies.sql
-- Multi-tenant orgs. A company has one owner, many recruiters.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_owner_id_idx on public.companies(owner_id);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('owner', 'recruiter')) default 'recruiter',
  invited_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists company_members_user_id_idx on public.company_members(user_id);

drop trigger if exists companies_touch_updated_at on public.companies;
create trigger companies_touch_updated_at
  before update on public.companies
  for each row execute function public.touch_updated_at();

-- Now that companies exists, add the FK from profiles.company_id.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_company_id_fkey'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete set null;
  end if;
end $$;

-- Helper functions used by RLS policies.
create or replace function public.is_company_member(c_id uuid, u_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = c_id and user_id = u_id
  );
$$;

create or replace function public.is_company_recruiter(c_id uuid, u_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = c_id
      and user_id = u_id
      and member_role in ('owner', 'recruiter')
  );
$$;

grant execute on function public.is_company_member(uuid, uuid) to authenticated, anon;
grant execute on function public.is_company_recruiter(uuid, uuid) to authenticated, anon;
