# Task Plan: Optimize Supabase + Vercel Infrastructure, Caching, Media Storage & Resource Usage

## Goal
Comprehensive optimization of the Supabase + Vercel infrastructure to minimize quota/resource usage, eliminate redundant database and API queries, implement multi-tier caching with smart invalidation, add database indexes, optimize static delivery with CDN caching headers on Vercel, optimize media handling, and implement a lightweight scheduled keep-alive without wasting user/client resources.

## Phases

- [x] **Phase 1: Architecture & Resource Audit**
  - Traced all Supabase queries, mutations, auth flows, GitHub API calls, and asset delivery paths.
  - Documented query frequencies, N+1 patterns, unindexed columns, and unnecessary re-fetches.
  - Recorded findings in `findings.md`.

- [x] **Phase 2: Multi-Tier Caching & Request Deduplication Layer**
  - Implemented an in-memory + persistent localStorage cache layer (`src/lib/cache.ts`) with configurable TTLs (Long Cache for static/media data, Medium Cache for explore directory & profiles, Short/Live for authenticated user actions).
  - Added request deduplication (`dedupeRequest`) to prevent duplicate concurrent queries.
  - Eliminated aggressive focus/visibility-change force refetches across all views.
  - Implemented event-driven cache invalidation on mutations (create, update, delete project, update profile).

- [x] **Phase 3: Supabase Database Query & Schema Optimization**
  - Replaced all `select('*')` with exact column projections in `src/lib/showcaseStore.ts`.
  - Added database indexes for `profile_id`, `(is_featured, display_order)`, `program`, and `created_at` in `supabase/schema.sql`, migration `20260102000000_performance_indexes.sql`, and `SupabaseGuideModal.tsx`.
  - Implemented caching for GitHub repo telemetry and contribution calendars.

- [x] **Phase 4: Authentication & Session Optimization**
  - Prevented duplicate `getSession()` / `loadProfile()` executions on startup in `src/context/AuthContext.tsx`.
  - Cached user profile and reused state across page transitions.

- [x] **Phase 5: Vercel Static Caching & Media Storage Optimization**
  - Configured `vercel.json` with immutable Cache-Control headers for static assets (`/assets/*`, fonts, icons) and HTML cache policies.
  - Created Supabase Storage bucket integration helper (`src/lib/storage.ts`) with CDN URL generation, lazy loading, and image optimization parameters.

- [x] **Phase 6: Ultra-Lightweight Scheduled Supabase Keep-Alive**
  - Created a low-frequency, resource-efficient GitHub Actions workflow (`.github/workflows/supabase-keepalive.yml`) that runs every 5 days with a single minimal `HEAD` check, preventing project pausing while using 0 client bandwidth and near-zero quota.

- [x] **Phase 7: Verification & Metrics Comparison**
  - Verified build (`npm run build` and `npm run lint` passing with 0 errors).
  - Verified cache, deduplication, invalidation, and column projection logic with unit test suite (`src/lib/__tests__/cache.test.ts`).
  - Documented before vs after telemetry and quota savings in `progress.md` and `walkthrough.md`.

## Status & Confirmations
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Completed
- Phase 4: Completed
- Phase 5: Completed
- Phase 6: Completed
- Phase 7: Completed
