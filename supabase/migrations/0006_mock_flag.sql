-- 0006_mock_flag.sql
-- Single-row table flagging that the seed has run.
-- The service layer checks this to decide whether to fall back to bundled mocks
-- when the database returns empty results.

create table if not exists public.mock_seeded (
  id boolean primary key default true,
  seeded_at timestamptz not null default now(),
  seed_version integer not null default 1
);

-- RLS: only service role can read/write.
alter table public.mock_seeded enable row level security;
