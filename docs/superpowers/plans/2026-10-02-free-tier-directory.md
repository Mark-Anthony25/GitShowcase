# Free-tier directory implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitShowcase public reads paged and cache-backed while securing GitHub access and database mutations for free-tier operation.

**Architecture:** Public cards query a small, explicit Supabase projection rooted at showcased projects and use persisted repository stats. Supabase Edge Functions own GitHub requests; PostgreSQL owns project-limit and uniqueness enforcement. The Vite app remains static-first with route-level splitting.

**Tech Stack:** React 19, TypeScript, Vite, Supabase PostgREST/Auth/Storage/Edge Functions, PostgreSQL RLS, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-02-free-tier-public-directory-design.md`

## Global Constraints

- Do not add dependencies or paid services.
- Public browser reads use Supabase RLS; static delivery stays CDN-cacheable.
- Only Edge Functions use `GITHUB_TOKEN`; do not retain provider tokens in browser storage.
- Default repository-stat TTL is 12 hours; stale data is preferable to an upstream error.
- Explore default page size is 24; Landing default is 6.
- Production Supabase failures never become successful localStorage writes.

## Review Focus

- A case-only repository name updates an existing project instead of creating a duplicate.
- A fourth concurrent save fails at PostgreSQL even when all clients read the same initial count.
- A stale cache plus GitHub `429` renders stale data and defers the next refresh from `Retry-After`.
- A filter change resets pagination and requests no more than 25 rows.
- A failed configured-Supabase write is visible and produces no local-only project.

---

### Task 1: Database contracts

**Files:**

- Create: `supabase/migrations/20261002000000_free_tier_directory.sql`
- Modify: `supabase/schema.sql`, `src/lib/showcaseStore.ts`
- Test: `src/lib/__tests__/directoryContracts.test.ts`

**Interfaces:** Produces `normalizeRepoKey(repoFullName: string): string`, `getPublicDirectoryPage(options): Promise<{ items: StudentShowcaseData[]; hasMore: boolean }>` and `save_showcased_project(...)` RPC.

- [ ] Write tests for normalization, a 24-card page querying 25 rows, and configured-write error propagation.
- [ ] Run `npx tsx src/lib/__tests__/directoryContracts.test.ts`; expect failure because the contracts do not exist.
- [ ] Add `repo_key`, backfill it, replace the uniqueness constraint with `(profile_id, repo_key)`, add explicit cache/listing indexes, strict RLS, and a locking `SECURITY DEFINER` save RPC that returns stable errors for a fourth project.
- [ ] Implement the typed helpers and run the focused test; expect PASS.
- [ ] Commit: `git add supabase/migrations/20261002000000_free_tier_directory.sql supabase/schema.sql src/lib/showcaseStore.ts src/lib/__tests__/directoryContracts.test.ts && git commit -m "feat: enforce showcase directory integrity"`.

### Task 2: Cached GitHub data

**Files:**

- Create: `supabase/functions/refresh-repo-stats/index.ts`, `supabase/functions/github-repos/index.ts`, `src/lib/__tests__/repoStatsCache.test.ts`
- Modify: `src/lib/github.ts`, `vite.config.ts`, `vercel.json`
- Delete: `api/github-repos.ts`

**Interfaces:** `refresh-repo-stats` accepts `{ repoFullName: string }`; `github-repos` returns only the authenticated caller’s public repositories. Both consume `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server-side.

- [ ] Write tests proving a fresh cache skips GitHub and stale data is returned after simulated `429` with `Retry-After`.
- [ ] Run `npx tsx src/lib/__tests__/repoStatsCache.test.ts`; expect failure.
- [ ] Add cache helpers plus an authenticated refresh function that persists display fields, honors 403/429/Retry-After, and returns stale rows on upstream failure.
- [ ] Implement public-repo listing in `github-repos`; remove browser REST, GitHub HTML, Shields, and Vercel proxy fallback paths.
- [ ] Run focused tests; expect PASS.
- [ ] Commit all Task 2 files with `feat: cache GitHub repository metadata`.

### Task 3: Paged public UI

**Files:**

- Modify: `src/lib/showcaseStore.ts`, `src/components/ExploreView.tsx`, `src/components/LandingView.tsx`, `src/components/PublicProfileView.tsx`
- Create: `src/lib/__tests__/publicDirectoryPagination.test.ts`
- Modify: `src/components/__tests__/exploreProjectsOnly.test.ts`

**Interfaces:** Explore consumes `getPublicDirectoryPage({ query, program, offset, limit })`; it renders a 24-card page and a load-more action.

- [ ] Write tests for range limit, reset-on-filter, and no public import/call to `fetchLiveRepoStats`.
- [ ] Run `npx tsx src/lib/__tests__/publicDirectoryPagination.test.ts && npx tsx src/components/__tests__/exploreProjectsOnly.test.ts`; expect failure.
- [ ] Query explicit project/profile/cache columns rooted at projects, apply predicates before range/order, use demo data only when Supabase is unconfigured.
- [ ] Add 250 ms debounced search and load-more behavior while retaining current cards/loading/empty/error UI.
- [ ] Make Landing request six records and PublicProfile consume persisted cache data only.
- [ ] Run focused tests; expect PASS. Commit with `feat: paginate public project directory`.

### Task 4: Auth and durable mutations

**Files:**

- Modify: `src/context/AuthContext.tsx`, `src/lib/showcaseStore.ts`, `src/components/DashboardView.tsx`, `src/components/OnboardingModal.tsx`
- Modify: `src/context/__tests__/githubUsernameCasing.test.ts`, `src/lib/__tests__/profileUpdateAndProjects.test.ts`

**Interfaces:** UI consumes the save RPC and `github-repos` Edge Function. Auth keeps Supabase session persistence but no provider-token persistence.

- [ ] Write tests for `read:user`, no `gh_token_` storage writes, configured-save rejection, and canonical case-insensitive project behavior.
- [ ] Run the two focused tests; expect failure.
- [ ] Remove provider-token storage and reduce scope. Replace repository listing/mutation paths with Edge Function/RPC calls and surface existing error/retry state. Keep local writes only in explicitly unconfigured demo mode.
- [ ] Run focused tests; expect PASS. Commit with `fix: persist showcase mutations safely`.

### Task 5: Frontend and storage safeguards

**Files:**

- Modify: `src/lib/storage.ts`, `src/App.tsx`, `src/components/DashboardView.tsx`, `vercel.json`
- Create: `src/lib/__tests__/storage.test.ts`

**Interfaces:** Produces `validateAvatar(file: File): Promise<string | null>` and stable per-user upload paths.

- [ ] Write tests rejecting GIF, files over 5 MB, and invalid dimensions while accepting WebP/JPEG/PNG; assert headers target `/(.*)`.
- [ ] Run `npx tsx src/lib/__tests__/storage.test.ts`; expect failure.
- [ ] Validate decoded dimensions, use stable avatar paths, preserve responsive transformed URLs/lazy loading, lazy-load dashboard/onboarding, dynamically import confetti after successful publish, and apply a CSP plus frame/referrer/MIME/permissions headers across routes.
- [ ] Run focused tests; expect PASS. Commit with `perf: reduce public client payloads`.

### Task 6: Full verification and handoff

**Files:**

- Modify: `.env.example`, `README.md`

- [ ] Document Edge Function secrets, migration/function deployment, and exact dashboard steps.
- [ ] Run `npm run lint && npm test && npm run build`; expect exit 0.
- [ ] If preview access exists, run `curl -I https://<preview-url>/`; expect CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, and Permissions-Policy.
- [ ] Commit documentation with `docs: document free-tier deployment configuration`.
