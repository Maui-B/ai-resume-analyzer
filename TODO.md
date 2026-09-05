# AI Resume Analyzer - Todo List

## Completed Tasks

- [x] Fix listMyResumes() — add .eq('user_id', user.id) filter for defense-in-depth
- [x] Create missing jobs.$id.tsx route file (declared in routes.ts but 404s)
- [x] Revoke object URLs in ResumeCard and resume.tsx on unmount
- [x] Remove dead resumes[] array from constants/index.ts (keep AIResponseFormat + prepareInstructions)
- [x] Remove /wipe route and file (replaced by /settings)
- [x] One-click apply on /jobs/:id — create Application with best-matching resume
- [x] Fix remaining TypeScript errors in service layers (Json vs Feedback/MatchFeedback casting)
- [x] Add GitHub Actions CI: npm ci && lint && typecheck && build

## Pending Tasks

### Dashboard Enhancements

- [x] Enhance dashboard.jobs.tsx — add reopen, edit, filters
- [x] Enhance dashboard.jobs.new.tsx — AI skill suggestions from description
- [x] Enhance dashboard.applications.tsx — drag-and-drop Kanban, candidate details
- [x] Enhance jobs.tsx — add search/filter, salary display

### Edge Function Development (Stage 2)

- [x] Create provider-agnostic AI Edge Functions (supports Anthropic, OpenAI, Gemini, Grok, Qwen, OpenRouter, Ollama, LM Studio, vLLM)
- [x] Update app/lib/ai.ts to call Edge Functions instead of Puter
- [x] Remove Puter.js script tag and usePuterStore references
- [x] Add rate limiting to Edge Functions (10 AI calls/hour per user)

### Advanced Features

- [x] Multi-page PDF rendering (renders all pages into a single tall image)
- [x] Per-resume history — keep multiple versions with diff tracking
- [x] Resume library — filter, sort, tag, archive, delete individual resumes
- [x] Application status emails (Brevo)
- [x] Candidate ranking — sort applications by matchScore, highlight top match
- [x] Anonymized review mode — hide name/email/photo until revealed
- [x] Bulk actions — shortlist top N, reject rest with template
- [x] Notes & activity log per application
- [x] Team management (company_admin) — invite recruiters, set role, deactivate
- [x] Reports — time-to-hire, source, score distribution per job

### Infrastructure & Quality

- [x] SEO — per-route meta, OG tags, sitemap, robots.txt
- [x] Accessibility audit — keyboard nav, ARIA, focus-visible, screen reader pass
- [x] Observability — Sentry (client + server), structured logs, funnel analytics
- [x] Public landing page at / — move dashboard to /dashboard
- [x] Add basic tests for service layer (resumes, jobs, applications)

### Already Completed (from original plan)

- [x] Data export — download resumes + applications as JSON (POPIA-friendly)
- [x] Dashboard KPI tiles — open jobs, new apps (7d), shortlisted, hired
