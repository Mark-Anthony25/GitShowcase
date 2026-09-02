# Progress: Supabase + Vercel Optimization

## Session Log
- **Phase 1: Architecture Audit Completed**:
  - Inspected all Supabase interactions, Auth flows, GitHub API calls, and component lifecycles.
  - Identified wildcard selects, N+1 live repo stats loops, lack of persistent caching, duplicate session/profile fetches on startup, aggressive focus/visibility-change refetching, missing database indexes in SQL schema, and missing Vercel CDN Cache-Control headers.
- **Phase 2: Multi-Tier Caching & In-Flight Request Deduplication Completed**:
  - Implemented `src/lib/cache.ts` with in-memory + localStorage persistence and configurable TTLs.
  - Added `dedupeRequest` for coalescing concurrent queries into single network requests.
  - Removed aggressive tab-focus and visibilitychange polling across all view components (`DashboardView`, `ExploreView`, `PublicProfileView`, `LandingView`).
- **Phase 3: Query & Schema Optimization Completed**:
  - Replaced wildcard `SELECT *` with explicit `PROFILE_COLUMNS` and `PROJECT_COLUMNS` in `src/lib/showcaseStore.ts`.
  - Added B-Tree indexes in `supabase/schema.sql` and `supabase/migrations/20260102000000_performance_indexes.sql`.
  - Enhanced GitHub rate-limit protection in `src/lib/github.ts` using 10-15 minute cache TTLs.
- **Phase 4: Auth Session Deduplication Completed**:
  - Eliminated duplicate `loadProfile()` execution during startup in `src/context/AuthContext.tsx`.
- **Phase 5: Vercel Edge Caching & Storage Optimization Completed**:
  - Configured 1-year immutable caching for static assets in `vercel.json` and strict security headers.
  - Created `src/lib/storage.ts` for direct client-to-Supabase Storage uploads and CDN image transforms.
  - Added `loading="lazy"` and `decoding="async"` across student profile avatar images.
- **Phase 6: Ultra-Lightweight GitHub Actions Keep-Alive Completed**:
  - Created `.github/workflows/supabase-keepalive.yml` running every 5 days with zero client footprint.
- **Phase 7: Verification & Testing Completed**:
  - Passed `npm run lint` (0 TypeScript errors) and `npm run build` (production Vite bundle created in 3.99s).
  - Passed all unit tests in `src/lib/__tests__/cache.test.ts` (cache hits, TTL eviction, deduplication, invalidation, projections).
