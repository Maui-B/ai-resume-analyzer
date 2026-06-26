# Improvement Plan — ai-resume-analyzer

> Companion to `AGENTS.md`. This is the actionable plan; AGENTS.md is the project memory.
> Date: 2026-06-23 (revised: full Supabase path)

---

## TL;DR — the one-paragraph version

The cloned repo is a **single-sided jobseeker tool** that uploads a PDF, sends it to Claude 3.7 via Puter, and shows a JSON-formatted feedback dashboard. It has **zero recruiter/hiring-company capability**, **no backend of our own**, **no tests, no CI, no lint**, and a couple of correctness bugs (racey auth, no PDF multi-page, hardcoded model, user-leaky KV namespace). To make it work for **both** sides, we are going **full Supabase** — Supabase Auth + Postgres + Storage + Edge Functions, local-first via Supabase CLI on Docker Desktop, with a **mock-data fallback layer** so the app demos even with an empty database. The plan below is staged — **Stage 0 (hardening + Supabase infra) is the no-brainer**, **Stage 1 (two-sided roles) is the centerpiece**, Stages 2–4 scale from there.

---

## What's broken vs. missing

| Bucket | Examples |
|---|---|
| **Bugs to fix** | Racey `useEffect` auth redirects, `URL.createObjectURL` never revoked, `kv.list('resume:*')` not user-scoped, `/upload` has no auth gate, SSR + `window.puter` mismatch, hardcoded `claude-3-7-sonnet`, dead `constants/resumes` sample data |
| **Hygiene** | No lint, no formatter, no tests, no CI, no `.env.example`, no logging, no error reporting, JSM README still in place |
| **Accessibility** | Focus rings invisible against `inset-shadow`, dropzone has no ARIA, accordion buttons missing aria-expanded |
| **Product gap** | No recruiter/company side at all, no application tracking (despite the "Track Your Applications" hero), no job postings, no matching, no messaging |
| **Architectural gap** | No backend → cannot share data between users → cannot deliver the hiring-company side |

---

## Recommended path: 5 stages

Each stage is shippable on its own. Don't try to do all 5 at once.

---

### Stage 0 — Hygiene, bug fixes, Supabase infra (1–3 days)

No new product surface, just stop the bleeding AND stand up the backend.

**Hygiene**
- [ ] **Lint + format**: ESLint 9 flat config (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) + Prettier. Add `lint` and `format` scripts. **No pre-commit hook yet** (skip Husky — adds churn).
- [ ] **Typecheck in CI**: GitHub Actions runs `npm ci && npm run lint && npm run typecheck && npm run build`.
- [ ] **Fix the auth redirect race**: convert route guards from `useEffect` to React Router v7 `clientLoader` (throws redirect). Eliminates the protected-content flash.
- [ ] **Gate `/upload`**: add the same loader.
- [ ] **Revoke object URLs**: in `ResumeCard`, `resume.tsx`, store the URL in a ref and `URL.revokeObjectURL` on cleanup.
- [ ] **Switch SSR off**: set `ssr: false` in `react-router.config.ts`. Eliminates hydration warnings. (When we have real SEO needs in Stage 5, audit + re-enable.)
- [ ] **Replace `/wipe` with `/settings`**: account info, sign out, data export (download my resumes + applications as JSON), delete account (cascade via RLS). Confirm modal, proper layout, navbar.
- [ ] **Update README.md** to reflect the fork — keep JSM credit, add "what we changed", "how to run locally (Supabase + Docker)".

**Supabase infra** (the part that makes Stages 1+ possible)
- [ ] **Install Supabase CLI** (`npm i -g supabase`).
- [ ] **`supabase init`** in project root — creates `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`.
- [ ] **Migrations** (`supabase/migrations/<timestamp>_*.sql`):
  - `0001_profiles.sql` — `profiles(id PK = auth.users.id, role, full_name, company_id, created_at)`. Trigger to auto-create profile on `auth.users` insert.
  - `0002_companies.sql` — `companies(id, name, owner_id, created_at)` + `company_members(company_id, user_id, role, invited_at)`.
  - `0003_resumes.sql` — `resumes(id, user_id, job_title, company_name, job_description, image_path, resume_path, feedback_jsonb, created_at)`.
  - `0004_jobs.sql` — `jobs(id, company_id, posted_by, title, description, location, salary_min, salary_max, skills text[], status, created_at)`.
  - `0005_applications.sql` — `applications(id, job_id, jobseeker_id, resume_id, status, match_score, match_feedback_jsonb, notes, created_at)`.
  - `0006_mock_flag.sql` — `mock_seeded(id bool)` + seed flag.
- [ ] **RLS policies** — one policy file per table, restrictive by default. Jobseekers see only own resumes/applications; recruiters of a company see only that company's jobs and applications; jobs with `status='open'` are publicly readable.
- [ ] **`supabase/seed.sql`** — seeds 2 demo users (one jobseeker, one recruiter), 1 company, 4 jobs, 8 applications. Used by `supabase db reset` for repeatable local setup.
- [ ] **Mock data layer** (`app/lib/mock/*.ts`) — JSON fixtures mirroring the seed. Loaded when `VITE_DEMO_MODE=true` OR DB returns empty on first query.
- [ ] **Service layer** (`app/lib/services/{resumes,jobs,applications,companies}.ts`) — single entry point for components. Internally calls Supabase OR mock depending on flag.
- [ ] **Supabase client** (`app/lib/supabase.ts`) — typed singleton, generated types in `types/database.ts`.
- [ ] **`.env.example`** with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEMO_MODE`.
- [ ] **Replace `app/lib/puter.ts`** auth path — keep the AI wrapper for now (Puter-as-AI-gateway), remove auth/fs/kv usage. Put the Puter script tag behind a `VITE_USE_PUTER_AI` flag; default off once Edge Function is live.

**Acceptance**:
- `npm run lint && npm run typecheck && npm run build` all pass in CI.
- `supabase start` boots cleanly on Docker Desktop.
- `supabase db reset` creates schema + seed in one shot.
- Empty DB → app still renders using mock data + banner.
- Non-empty DB → app reads from Supabase, no mocks.
- SSR is off, no hydration warnings in console.

---

### Stage 1 — Roles & two-sided accounts (2–3 days)

Foundation for everything that follows. Depends on Stage 0 Supabase infra.

- [ ] **Role model**: `profiles.role enum ('jobseeker', 'recruiter', 'company_admin')`. Read via `useAuthStore` after Supabase auth resolves.
- [ ] **First-login onboarding** (`/onboarding`): after Supabase sign-up, if `profiles.role is null`, redirect to `/onboarding`. Pick role + (if recruiter) create or join a `Company`.
- [ ] **Routes guard by role** (via `clientLoader`):
  - `/`, `/upload`, `/resume/:id` → `jobseeker`
  - `/dashboard/*` → `recruiter` (own company)
  - `/dashboard/team` → `company_admin`
  - `/jobs`, `/jobs/:id` → public (signed-out users can browse)
  - `/auth`, `/onboarding` → public
- [ ] **`<RoleGuard role="recruiter">`** wrapping component for inline guards inside shared layouts.
- [ ] **Auth store refactor**: split `usePuterStore` into `useAuthStore` (Supabase auth + role) and `useAiStore` (Puter/Edge Function calls).
- [ ] **Role-aware nav**: navbar shows different links per role. Jobseeker sees "Upload Resume"; recruiter sees "Dashboard"; signed-out sees "Browse Jobs" + "Sign in".

**Acceptance**: A user signs up, picks recruiter, lands on `/dashboard`, doesn't see jobseeker nav. A jobseeker cannot reach `/dashboard` even by typing the URL. Signed-out user can browse `/jobs` but Apply prompts sign-in.

---

### Stage 2 — Replace Puter AI with Edge Function (1–2 days)

**Decision already made**: full Supabase. Puter was retained as the AI gateway in Stage 0. This stage replaces it with a Supabase Edge Function so the Anthropic API key never touches the client.

- [ ] Create `supabase/functions/ai-feedback/index.ts` — accepts `{ resumePath, jobDescription }`, reads the PDF from Storage, calls Anthropic Claude 3.7 Sonnet with the existing `prepareInstructions` prompt, returns the same `Feedback` JSON shape.
- [ ] Create `supabase/functions/match-score/index.ts` — accepts `{ jobId, resumeId }`, returns `{ matchScore, missingSkills, topStrengths, concerns, suggestions }`.
- [ ] Move `prepareInstructions` and `AIResponseFormat` from `constants/index.ts` into `supabase/functions/_shared/prompts.ts` so both client (preview) and server (real call) share the schema.
- [ ] Set secrets: `supabase secrets set ANTHROPIC_API_KEY=...` for local + cloud.
- [ ] Update `app/lib/ai.ts` — `analyzeResume(...)` now `supabase.functions.invoke('ai-feedback', ...)`. Remove Puter script from `root.tsx`.
- [ ] Remove the `puter.d.ts` types and the `ai.chat` callsite.
- [ ] **Rate limit**: Edge Function checks per-user invocation count (10/hour), returns 429 on excess.

**Acceptance**: `supabase functions serve ai-feedback` works locally. `npm run dev` calls the function (or mock if `VITE_DEMO_MODE=true`), gets back the same JSON shape as before. No Puter references left in the codebase except in git history.

---

### Stage 3 — Jobseeker enhancements (3–5 days, depends on Stage 2)

Now the jobseeker side stops being a single-shot analyzer and becomes a career workspace.

- [ ] **Multi-page PDF rendering**: render all pages of the PDF, not just page 1. Concatenate into a tall image, OR show page thumbnails.
- [ ] **Per-resume history**: when you upload resume v2 against the same job, keep both with timestamps. Show diff in scores.
- [ ] **Resume library**: filter, sort, tag, archive, delete individual resumes. Replace `/wipe` with a proper `/settings`.
- [ ] **Job application tracking**: each `Application` shows up on `/` with status (`submitted`, `reviewed`, `shortlisted`, `interviewing`, `rejected`, `hired`). The hero copy "Track Your Applications" becomes literally true.
- [ ] **Apply with one click**: on `/jobs/:id`, "Apply with my best-matching resume" button → server computes match score → creates `Application`.
- [ ] **Notifications**: when an application moves status, send an email (Resend or Postmark). Web push optional.
- [ ] **Export**: download your data as JSON. POPIA-friendly.

**Acceptance**: A jobseeker uploads a resume, applies to 3 jobs, gets emails when statuses change, can delete one resume without nuking everything.

---

### Stage 4 — Recruiter / company dashboard (5–10 days)

The new product surface.

- [ ] **`/dashboard`** — KPI tiles: open jobs, new applications (last 7d), shortlisted, hired-this-month.
- [ ] **`/dashboard/jobs`** — table of jobs with filters. Create / edit / close.
- [ ] **`/dashboard/jobs/new`** — multi-step form: basics → description → required skills → screening questions (optional). Use the existing AI to **suggest skills from the description**.
- [ ] **`/dashboard/applications`** — Kanban view (Trello-style: submitted → reviewed → shortlisted → interview → hired/rejected). Drag a card to change status.
- [ ] **Candidate ranking**: applications sorted by `matchScore` desc. Top match highlighted.
- [ ] **Anonymized review mode**: hide name/email/photo until you click "reveal" — protects against bias, also a legal hedge.
- [ ] **Bulk actions**: shortlist top N, reject rest with a templated message.
- [ ] **Notes & activity log**: per-application notes, audit trail of who did what.
- [ ] **Team (company_admin only)**: invite recruiters via email, set role, deactivate.
- [ ] **Reports**: time-to-hire, source-of-application, score distribution per job.

**Acceptance**: A recruiter posts a job, receives 10 applications, ranks them by AI score, moves 3 to "interview", sends a templated rejection to the other 7, and exports a CSV of the pipeline.

---

### Stage 5 — Polish & launch (continuous)

- [ ] **SEO**: per-route meta, OG image, sitemap, robots.txt.
- [ ] **i18n**: English first; structure for SA locales later.
- [ ] **Accessibility audit**: keyboard nav, screen reader pass, focus-visible everywhere.
- [ ] **Observability**: Sentry (client + server), structured logs, basic funnel analytics (PostHog / Plausible).
- [ ] **Billing**: if you ever charge — Stripe, with a `Plan` enum on `Company`. Skip until you have 10 paying companies.
- [ ] **Marketing site**: a real `/` (the home page is currently an authenticated dashboard). Add a public landing page at `/` for visitors and move the dashboard to `/dashboard`.

---

## Architecture decisions

These are the load-bearing choices. **All resolved as of 2026-06-23.**

| # | Decision | Resolution |
|---|---|---|
| 1 | Backend | **Full Supabase** (Postgres + Auth + Storage + Edge Functions + RLS) |
| 2 | SSR | **Off** for v1 |
| 3 | AI provider | **Anthropic Claude 3.7 Sonnet** via Supabase Edge Function |
| 4 | Auth model | **Supabase Auth** (email + OAuth) |
| 5 | Storage | **Supabase Storage** (private buckets, signed URLs) |
| 6 | Resume parsing beyond AI | Skip for v1 |
| 7 | Multi-tenant company model | Team from day one (`companies` + `company_members`) |
| 8 | Local dev | **Supabase CLI on Docker Desktop**, migrate to Cloud when finished |
| 9 | Demo/empty-DB UX | Mock data fallback via `VITE_DEMO_MODE` flag |

## Mock data strategy

The user demos the app before seeding real data, so we need a graceful "empty DB" experience.

**Approach**:
- Service layer (`app/lib/services/*.ts`) is the **only** entry point for components — they never call Supabase directly.
- Each service method:
  1. If `VITE_DEMO_MODE=true` → return bundled mock.
  2. Else query Supabase; if result is empty AND it's a "list" operation AND no real users have written yet → return mock + set a global flag that triggers the banner.
  3. Writes are no-ops in demo mode (return success after 300ms fake latency).
- A `<DemoModeBanner>` component renders at the top of every page when in demo mode.
- Mocks live in `app/lib/mock/*.ts` as typed JSON, mirroring the seed fixtures in `supabase/seed.sql`.

**Coverage** (minimum viable):
- 3 sample resumes with full feedback JSON (so the dashboard looks real).
- 4 sample jobs (mix of statuses: open, closed, paused, draft).
- 8 sample applications across all statuses.
- 2 sample companies.
- 3 sample users (1 jobseeker, 1 recruiter, 1 company_admin).

**Why not just `VITE_DEMO_MODE`?**: Because the user might demo with a partially-seeded DB. The empty-fallback gives both modes: explicit toggle OR auto-detection.

---

## What I would build first if you said "go"

A 2-week MVP:

**Week 1**
- Day 1–2: Stage 0 (hygiene + bug fixes)
- Day 3–5: Stage 1 (roles + onboarding)

**Week 2**
- Day 6–8: Stage 2 Option A (Hono + Postgres + the 5 endpoints)
- Day 9–10: Stage 3 lite (apply-with-resume + status email)

End of week 2 you have: a two-sided app where a recruiter can post a job, a jobseeker can apply, AI gives a match score, both sides can see the application. That alone is the **demoable MVP** — Stage 4 (Kanban, anonymized review, etc.) is what turns it into a product.

---

## What I won't do without your sign-off

- Migrate off Puter (Stage 2 Option B) — big move.
- Enable SSR — I recommended turning it off; the opposite is a real undertaking.
- Add paid billing — premature.
- Anything that requires a domain purchase or hosting account in your name.

---

## Files referenced

- `AGENTS.md` — full project memory, the source of truth for any future agent
- `app/lib/puter.ts` — Puter store, where roles + multi-user changes start
- `app/routes/` — where new routes go
- `constants/index.ts:AIResponseFormat` — AI contract, change alongside `types/index.d.ts:Feedback`

<media src="E:\Projects\ai-resume-analyzer\IMPROVEMENT_PLAN.md" />
<media src="E:\Projects\ai-resume-analyzer\AGENTS.md" />