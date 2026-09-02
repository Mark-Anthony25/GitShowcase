# Findings: Supabase + Vercel Architecture & Resource Usage Audit

## 1. Supabase Query & Database Resource Bottlenecks
- **Wildcard Queries (`SELECT *`)**: `getProfileById`, `getStudentShowcaseByUsername`, `getAllStudentsShowcase`, and `getStudentShowcasedProjects` in `src/lib/showcaseStore.ts` execute `.select('*')` or `.select('*, showcased_projects(*)')`, pulling unnecessary payload and increasing bandwidth and Postgres I/O.
- **Missing Database Indexes in SQL Schema**:
  - `showcased_projects` has a foreign key on `profile_id`, but lacks an index on `profile_id`. Queries filtering `.eq('profile_id', ...)` perform full table scans as rows grow.
  - Sorting by `is_featured` and `display_order` lacks composite indexes `(is_featured, display_order)`.
  - Filtering by `program` in explore lacks an index on `profiles(program)`.
- **Unused `repo_stats_cache` Table**: The SQL schema defined `repo_stats_cache`, but `src/lib/showcaseStore.ts` never stored or read cached GitHub stats from Supabase, forcing repeated direct GitHub API calls for every repo on every page load.
- **Aggressive Focus / Visibility Refetching**:
  - `DashboardView.tsx`, `ExploreView.tsx`, `PublicProfileView.tsx`, and `LandingView.tsx` attached `window.addEventListener('focus', ...)` and `document.addEventListener('visibilitychange', ...)` that unconditionally executed `(force = true)` fetches. Switching browser tabs triggered multiple bursts of database and GitHub API requests.

## 2. Authentication & Session Duplication
- **Duplicate Startup Profile Loads**: In `src/context/AuthContext.tsx`, `supabase.auth.getSession()` was called on mount, followed immediately by the `onAuthStateChange` subscriber firing `INITIAL_SESSION`, resulting in two sequential `loadProfile()` calls querying Supabase for the exact same profile within milliseconds.
- **No In-Flight Request Deduplication**: If multiple components requested the same user profile or showcase simultaneously, multiple identical HTTP requests were fired.

## 3. Caching Architecture Gaps
- **Transient Memory-Only Cache**: Cache TTL in `github.ts` was only 30 seconds (`CACHE_TTL_MS = 1000 * 30`), causing constant cache misses during ordinary navigation between Home, Explore, and Profile views.
- **Lack of Multi-Tier Data Classification**:
  - *Static/Long Cache*: Degree programs, static config, icons, media assets.
  - *Medium Cache (5-15 mins)*: Public student directory, public profiles, GitHub stars/forks/contributions.
  - *No Cache / Revalidate on Mutation*: User project additions, edits, unpublishing, profile saves.
- **No Event-Driven Cache Invalidation**: Caches were time-based without explicit mutation hooks to clear or update specific entity keys immediately upon user action.

## 4. Vercel & Media Storage Efficiency
- **Vercel Static Delivery**: `vercel.json` had only a simple SPA rewrite `/(.*) -> /index.html`. It lacked `Cache-Control` headers for immutable static assets (`/assets/*`, fonts, SVG icons). Browsers and Vercel CDN were re-validating assets with `304 Not Modified` or full downloads rather than serving directly from Edge Cache (`max-age=31536000, immutable`).
- **Media Delivery**: Media (avatars and project links) are currently loaded from GitHub (`avatars.githubusercontent.com`) or fallback URLs. We should provide a dedicated Supabase Storage helper (`src/lib/storage.ts`) with CDN URL generation, lazy loading, and dimension optimization so that user uploads do not route through Vercel serverless functions.

## 5. Supabase Keep-Alive Mechanism
- **Analysis**: Supabase Free Tier pauses projects after 7 days of total inactivity.
- **Anti-Pattern to Avoid**: Polling Supabase from client-side visitors or running continuous browser intervals wastes quota and database connection slots.
- **Optimal Solution**: A lightweight GitHub Actions cron workflow (`.github/workflows/supabase-keepalive.yml`) running once every 5 days (well within the 7-day pause window) that performs a single minimal HTTP `HEAD` or 1-row REST select (`/rest/v1/profiles?select=id&limit=1`). This consumes 0 client bandwidth, 0 Vercel function executions, and exactly 6 tiny requests per month on Supabase.
