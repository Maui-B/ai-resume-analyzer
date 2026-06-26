# AGENTS.md — ai-resume-analyzer

> Project memory for AI agents. Consumed per [agents.md spec](https://agents.md) by OpenCode, Codex, Cursor, Aider, Devin, Gemini CLI, etc.
> Last updated: 2026-06-23

---

## 1. What this project is

A **two-sided web app** (jobseeker + hiring company) that:
- Authenticates users via **Supabase Auth** (email + OAuth). Puter.js is **only used as the AI gateway** (Claude calls) — not for auth/storage/KV.
- Lets a logged-in user pick a role at onboarding: `jobseeker` | `recruiter` | `company_admin`.
- Jobseekers upload a PDF resume + a job title/description; recruiters post jobs, review applications, run AI match scoring.
- PDF rendering via pdfjs, uploaded to **Supabase Storage** (resumes + rendered preview images).
- AI calls go through a Supabase Edge Function that proxies to **Anthropic Claude 3.7 Sonnet** (or any future model) — keeps API key server-side and lets us swap models.
- All relational data lives in **Supabase Postgres** with **Row Level Security (RLS)** so recruiters and jobseekers see only what they should.
- Renders a feedback dashboard (jobseeker) and a Kanban + KPI dashboard (recruiter).

**Origin**: Cloned from `https://github.com/adrianhajdin/ai-resume-analyzer.git` (JavaScript Mastery / Adrian Hajdin tutorial). Local git is on the original JSM history; no custom commits yet beyond `package-lock.json` churn.

**Local dev**: **Supabase CLI** against **Docker Desktop** (user runs locally first, migrates to Supabase Cloud when the project is finished). See §9.

**Demo mode**: when the database is empty (fresh local stack, or no rows for the entity being queried), the service layer falls back to **bundled mock JSON** and shows a "Demo mode" banner. Lets the user present the app before any real data exists. Toggle via `VITE_DEMO_MODE=true` to force mock regardless of DB state.

**Audience**: **Jobseeker + hiring company**. Recruiter and jobseeker flows are first-class.

---

## 2. Tech stack (verified from `package.json` + `react-router.config.ts`)

| Layer            | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Framework        | **React 19** + **React Router v7** (file/config routing, **SSR off**)  |
| Build            | Vite 6 + `@react-router/dev` plugin                                    |
| Language         | TypeScript 5.8, `strict: true`, `verbatimModuleSyntax: true`           |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite`) + `tw-animate-css`               |
| State            | **Zustand** stores: `useAuthStore`, `useResumeStore`                  |
| Backend          | **Supabase** (Postgres + Auth + Storage + Edge Functions + RLS)        |
| Local dev        | **Supabase CLI** against **Docker Desktop** (`supabase start`)         |
| Cloud            | **Supabase Cloud** (when the project is finished)                     |
| AI               | Anthropic Claude 3.7 Sonnet via **Supabase Edge Function** proxy       |
| PDF              | `pdfjs-dist` 5.x with local worker at `public/pdf.worker.min.mjs`      |
| Dropzone         | `react-dropzone`                                                       |
| Container        | Multi-stage `Dockerfile` (node:20-alpine)                              |
| Lint             | **ESLint 9** flat config + Prettier (added in Stage 0)                 |

No backend server we own — Supabase IS the backend. No test framework yet, no CI config, linting added in Stage 0.

---

## 3. Directory map (only files that exist)

```
ai-resume-analyzer/
├── app/
│   ├── app.css                      # Tailwind v4 theme + custom component classes
│   ├── root.tsx                     # <html> shell, loads Puter.js script, calls usePuterStore().init()
│   ├── routes.ts                    # index, /auth, /upload, /resume/:id, /wipe
│   ├── components/
│   │   ├── Accordion.tsx            # Context-based accordion, allowMultiple default false
│   │   ├── ATS.tsx                  # ATS score card (gradient + good/warn/bad icon)
│   │   ├── Details.tsx              # Accordion over 4 categories (tone, content, structure, skills)
│   │   ├── FileUploader.tsx         # react-dropzone, PDF only, 20MB max
│   │   ├── Navbar.tsx               # Logo + "Upload Resume" button
│   │   ├── ResumeCard.tsx           # Home list card with ScoreCircle + image preview
│   │   ├── ScoreBadge.tsx           # Pill: Strong / Good Start / Needs Work (>70/>49/else)
│   │   ├── ScoreCircle.tsx          # SVG circle progress (used on cards)
│   │   ├── ScoreGauge.tsx           # SVG half-gauge (used on detail page)
│   │   └── Summary.tsx              # Overall gauge + 4 category rows
│   ├── lib/
│   │   ├── pdf2img.ts               # Loads pdfjs-dist, renders page 1 to canvas, exports PNG
│   │   ├── puter.ts                 # Zustand store: auth, fs, ai, kv namespaces
│   │   └── utils.ts                 # cn() (clsx + tailwind-merge), formatSize, generateUUID
│   └── routes/
│       ├── home.tsx                 # Lists resumes from kv.list('resume:*', true)
│       ├── auth.tsx                 # Puter sign-in / sign-out, redirects via ?next=
│       ├── upload.tsx               # Form + analyze flow, writes kv then navigates to /resume/:id
│       ├── resume.tsx               # Detail page: image preview + Summary/ATS/Details
│       └── wipe.tsx                 # Debug page — lists files, kv.flush, delete all (rough)
├── constants/
│   └── index.ts                     # DEAD-CODE sample resumes[] + AIResponseFormat + prepareInstructions()
├── public/
│   ├── favicon.ico
│   ├── pdf.worker.min.mjs           # pdfjs worker
│   ├── icons/                       # ats-{good,warning,bad}, back, check, cross, info, pin, warning
│   ├── images/                      # bg-{auth,main,small}.svg, resume-scan*.gif, resume_0{1,2,3}.png
│   └── readme/                      # hero.webp, jsmpro.webp, videokit.webp
├── types/
│   ├── index.d.ts                   # Resume + Feedback interfaces (global ambient)
│   └── puter.d.ts                   # Puter JS types (global ambient)
├── Dockerfile                       # multi-stage build, CMD ["npm","run","start"]
├── .dockerignore
├── .gitignore
├── package.json
├── package-lock.json
├── react-router.config.ts           # ssr: true
├── tsconfig.json                    # strict, paths: ~/* -> ./app/*
├── vite.config.ts                   # tailwind + reactRouter + tsconfigPaths
└── README.md                        # Original JSM README — not updated for this fork
```

---

## 4. Data model

### 4a. Postgres tables (Supabase)

| Table             | Purpose                                                              | RLS shape                                              |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| `profiles`        | Extends `auth.users`. Stores `role`, `full_name`, `company_id`       | user can read/update own row; admins can read all      |
| `companies`       | `{ id, name, owner_id, created_at }`                                 | members can read; only owner can update                |
| `company_members` | `{ company_id, user_id, role: 'owner'\|'recruiter', invited_at }`    | user can read own row; owner can manage                |
| `resumes`         | User's resumes (jobseeker side). Linked to `auth.users.id`.          | owner reads/writes; never readable by recruiters directly |
| `jobs`            | Recruiter-posted jobs. `{ id, company_id, posted_by, title, ... }`   | public read for `status='open'`; recruiters of owning company write |
| `applications`    | `{ id, job_id, jobseeker_id, resume_id, status, match_score, ... }`  | jobseeker reads/writes own; recruiter of owning job reads |
| `mock_seeded`     | Single-row table flag: `true` after seed runs. Lets the app know DB has real data. | service-role only |

### 4b. Storage buckets (Supabase Storage)

- `resumes/` — original PDFs. Path: `{user_id}/{resume_id}.pdf`. Private; signed-URL read.
- `resume-previews/` — rendered PNG page-1. Path: `{user_id}/{resume_id}.png`. Private; signed-URL read.

### 4c. Edge Functions

- `ai-feedback` — POST `{ resumePath, jobDescription }` → calls Anthropic Claude → returns `Feedback` JSON. The API key lives in the function's secrets, never exposed to the client.

### 4d. TypeScript surface (in `types/database.ts`, generated by `supabase gen types typescript`)

The generated `Database` type is the source of truth. We re-export typed handles:

```ts
export type Profile  = Database['public']['Tables']['profiles']['Row'];
export type Resume   = Database['public']['Tables']['resumes']['Row'];
export type Job      = Database['public']['Tables']['jobs']['Row'];
export type Application = Database['public']['Tables']['applications']['Row'];
```

### 4e. Mock data fallback (demo mode)

When `VITE_DEMO_MODE=true` OR the relevant table returns zero rows on first query, the service layer returns bundled JSON from `app/lib/mock/*.ts`. The user sees a "Demo mode — using bundled sample data" banner. Writes are simulated (resolve after 300ms) so the UI feels alive. Mocks include:

- 3 sample resumes with full AI feedback JSON
- 4 sample jobs (2 open, 1 closed, 1 paused)
- 8 sample applications across various statuses
- 2 sample companies

This is the demo/presentation affordance — needed because the user demos the app before seeding real data.

---

## 5. The five routes — current behavior

| Route            | File                | Auth gate?            | What it does                                                                 |
| ---------------- | ------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `/`              | `routes/home.tsx`   | Yes (redirects)       | Lists resumes from KV                                                       |
| `/auth`          | `routes/auth.tsx`   | No                    | Login / logout button; reads `?next=` param                                  |
| `/upload`        | `routes/upload.tsx` | **No** (latent bug)   | Form: company / title / description / PDF → analyze → redirect              |
| `/resume/:id`    | `routes/resume.tsx` | Yes (redirects)       | Renders image + Summary + ATS + Details                                     |
| `/wipe`          | `routes/wipe.tsx`   | Yes (redirects)       | Debug: list files, flush KV, delete everything — no confirm, no styling     |

Auth gating is implemented as a `useEffect` redirect — render-then-redirect means the protected content flashes for a frame. Should be a `loader` or `clientLoader`.

---

## 6. Known issues / smells (from the code, not opinion)

1. **`verbatimModuleSyntax: true` + `import {usePuterStore}` is a type-only or runtime import?** — Works because `usePuterStore` is a runtime value. But any future `import type` mistake will break builds silently. Watch for it.
2. **Dead `constants/index.ts` `resumes` array** — declared but not imported anywhere. Harmless; remove for cleanliness.
3. **Hardcoded model `claude-3-7-sonnet`** in `app/lib/puter.ts:353` — no way to switch, no fallback, no streaming.
4. **PDF rendering grabs page 1 only** (`pdf2img.ts:36`) — multi-page resumes are silently truncated.
5. **`/upload` has no auth check** — anyone can POST and they'll get a row under their Puter user, but the check pattern is missing. Inconsistent with `/`, `/resume/:id`, `/wipe`.
6. **Racey auth redirects** — `useEffect` in `home.tsx:21-23` runs after first paint.
7. **`kv.list('resume:*', true)` is not user-namespaced** — fine for single-user, broken for multi-user (see §4).
8. **No error boundary on `/upload` analyze** — `setStatusText` returns early on errors but no toast, no retry.
9. **`/wipe` is unsafe and unstyled** — single-click `fs.delete` per file with no confirm, no protected layout, no navbar.
10. **No tests, no CI, no lint, no formatter, no pre-commit hook** — `package.json` has no `test` / `lint` scripts beyond `typecheck`.
11. **README is the original JSM copy** — no fork notes, no contribution guide, no architecture diagram.
12. **`react-router.config.ts` enables SSR**, but the app uses `window.puter` everywhere — SSR will throw on every navigation. The `<script src="https://js.puter.com/v2/">` in `root.tsx` only runs client-side. **This will cause SSR errors / hydration mismatches** unless RR7's data flow already handles `typeof window` checks (it appears to, but verify at runtime).
13. **`@types/node` is in devDependencies** but `tsconfig.json` has `"types": ["node", "vite/client"]` — fine, but unconventional (node types in devDeps).
14. **`usePuterStore.init()` polls `window.puter` every 100ms** with a 10s timeout — works but burns setIntervals until Puter loads.
15. **No image optimization** — `public/images/resume-scan-2.gif` is 616KB, `resume_01.png` is 390KB. No lazy loading, no `loading="lazy"`.
16. **Memory leak risk** in `ResumeCard.tsx:14` and `resume.tsx:36/42` — `URL.createObjectURL` is called but `URL.revokeObjectURL` is never called on unmount.
17. **`<a target="_blank" rel="noopener noreferrer">`** in `resume.tsx:64` — has `rel="noopener noreferrer"`, good. But the link opens the Puter-fetched blob URL, which is a `URL.createObjectURL` result. Fine.
18. **No CSRF / rate limit** — fine for client-only, but for the hiring side we WILL need a backend.

---

## 7. The jobseeker / hiring-company gap — **decision made**

**Decision**: Full Supabase. Puter keeps only the AI role (and even that moves behind an Edge Function in Stage 2+). Reasons:
- User runs **all** projects on Supabase — consistency wins.
- Local-first via **Docker Desktop** + Supabase CLI; cloud migration when project is finished.
- Clean RLS isolation for two-sided privacy without bespoke auth hacks.
- Storage, Auth, Edge Functions, DB all in one platform — fewer moving parts than a hybrid.
- Mock data fallback (see §4e) means we can demo before any real data exists.

### 7a. Identity / roles
- Auth via Supabase Auth. `profiles` table extends with `role` + `full_name` + `company_id`.
- Roles: `jobseeker` | `recruiter` | `company_admin`.
- Onboarding wizard at `/onboarding` for first-login role pick + (recruiter) company create/join.

### 7b. Domain entities
See §4a — `companies`, `jobs`, `applications`, `resumes`, `profiles`, `company_members`, `mock_seeded`.

### 7c. New routes
- `/jobs` — public list of open jobs (visible to anyone, including logged-out).
- `/jobs/:id` — job detail + Apply button for jobseekers.
- `/onboarding` — first-login role picker.
- `/dashboard` — recruiter KPI tiles.
- `/dashboard/jobs` — manage job postings (recruiter).
- `/dashboard/jobs/new` — create job posting (recruiter).
- `/dashboard/applications` — Kanban applications by job (recruiter).
- `/dashboard/candidates` — search candidates (recruiter, anonymized).
- `/dashboard/team` — invite recruiters (company_admin only).
- `/settings` — replaces `/wipe`. Account, data export, delete.

### 7d. New flows
- **Jobseeker applies**: pick resume → click Apply → creates `Application` row → server computes match score via Edge Function.
- **Recruiter reviews**: dashboard → AI-ranked applications → drag to change status.
- **Match score**: Edge Function calls Anthropic with the existing `prepareInstructions` prompt, returns `{ matchScore, missingSkills, topStrengths, concerns, suggestions }`. Cached on `Application`.
- **Two-sided privacy**: RLS enforces it. Jobseeker resumes are PII; recruiter reads them ONLY through an `Application` row (which has its own RLS).

### 7e. Backend = Supabase
The whole stack now has a real backend. See §4.

### 7f. Match score / ranking
Reuse `prepareInstructions` shape; expand to `matchScore` instead of just `overallScore`. Cache on `Application`.

---

## 8. Non-functional requirements for v2

- **Accessibility**: keyboard nav on accordion, ARIA labels on dropzone, focus rings on inputs (currently invisible against `inset-shadow`).
- **i18n**: South Africa locale, but English-first. Add a `lang` switch if/when needed.
- **Mobile**: `md:` / `lg:` breakpoints in CSS; the home list collapses to a column. Resume detail page is two-column → reverse on mobile. Works.
- **SEO**: SPA with SSR — add proper meta per route, OG tags, sitemap.
- **Observability**: no logging, no error reporting. Add Sentry (client + server) before public launch.
- **Rate limits**: Puter AI has no rate limit in this app. Need a server-side queue / per-user quota.

---

## 9. Build / run / deploy

- **First-time setup**:
  1. Install Supabase CLI: `npm i -g supabase` (or use `npx supabase`).
  2. Make sure **Docker Desktop** is running.
  3. From project root: `supabase start` — boots local Postgres + Studio + Storage + Auth on Docker.
  4. Copy `.env.example` → `.env.local`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the `supabase start` output.
  5. `supabase db reset` — runs migrations + seed (mock data + 1 demo user per role).
  6. `npm install` then `npm run dev`.
- **Dev**: `npm run dev` → `http://localhost:5173`
- **Build**: `npm run build` (RR7 builds client bundle only — SSR is off)
- **Start**: `npm run start` → `react-router-serve ./build/server/index.js`
- **Typecheck**: `npm run typecheck` (`react-router typegen && tsc`)
- **Lint**: `npm run lint` (ESLint flat config)
- **Format**: `npm run format` (Prettier)
- **DB migrations**: `supabase db diff -f <name>` then commit `supabase/migrations/*.sql`.
- **Generate types**: `supabase gen types typescript --local > types/database.ts`.
- **Studio**: `supabase studio` → `http://localhost:54323` (DB UI).
- **Docker (app container)**: multi-stage Dockerfile, runs `npm run start` on port 3000.

**Cloud migration (when project is finished)**: `supabase link --project-ref <ref>` then `supabase db push` to push migrations; create the same env vars on the host. Storage buckets and Edge Functions deploy via `supabase functions deploy`.

No secrets in repo. Edge Function secrets managed via `supabase secrets set ANTHROPIC_API_KEY=...`.

---

## 10. Conventions to follow

- Imports use `~/...` path alias (mapped to `app/`).
- Tailwind utility classes inline; theme tokens in `app/app.css` (`@theme`).
- Custom component classes (`primary-button`, `gradient-border`, `resume-card`, etc.) live in `app/app.css` `@layer components`.
- All Puter interaction goes through `usePuterStore` — never call `window.puter` directly from a component.
- Use `cn(...)` from `~/lib/utils` for conditional class merging.
- TypeScript `strict` + `verbatimModuleSyntax`: prefer `import type { Foo }` for type-only.

---

## 11. Resolved decisions + open questions

**Resolved** (2026-06-23):
- ✅ **Backend = full Supabase** (decision reversed from Hono+Postgres).
- ✅ **Local-first dev**: Supabase CLI + Docker Desktop; cloud migrate when finished.
- ✅ **Mock data fallback** for demo/presentation when DB is empty.
- ✅ **SSR off** for v1 (Puter would have caused hydration mismatches; now moot — Supabase Auth is also client-side).
- ✅ **Puter.js**: kept only as the AI call surface (until Edge Function lands in Stage 2/3). Remove direct Puter script load from `root.tsx` once Edge Function is in.

**Still open**:
- [ ] South Africa / ZAR pricing for salary fields, or just free-text?
- [ ] Are PII / POPIA / GDPR constraints in scope? (Probably yes for SA market.)
- [ ] Resume parsing beyond AI (keyword extraction, embeddings)?
- [ ] Email provider for status notifications (Resend vs Postmark)?
- [ ] OAuth providers beyond email — Google? LinkedIn? (Supabase makes this a config toggle.)

---

## 12. Pointers (don't relearn)

- `app/lib/puter.ts` is the brain — auth, fs, ai, kv, init. Touch it for any Puter behavior.
- `constants/index.ts:AIResponseFormat` defines the AI's contract. Update it AND `types/index.d.ts:Feedback` together.
- `react-router.config.ts:ssr: true` is the default; if you see hydration warnings around Puter, set `ssr: false` for now.
- `public/pdf.worker.min.mjs` is the pdfjs worker — keep it, do not bundle.
- `app/app.css` defines custom classes — most styling is inline Tailwind, but `primary-button`, `gradient-border`, `resume-card`, `feedback-section`, `resume-nav`, `navbar` are real reusable utilities.
