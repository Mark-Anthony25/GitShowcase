# Discoveries & Findings: GitShowcase

## Project Identity & Context
- **Name:** GitShowcase (GitShowcase • Isabela State University - Cauayan Campus)
- **Target Audience:** Student developers (BSCS, BSIT, BSEMC, BSAIS, and related computing programs at ISU Cauayan Campus), faculty advisers, evaluators, and peer student developers.
- **Core Purpose:** Centralized repository showcase and academic portfolio registry linking students' GitHub activity, highlighted capstone projects, academic identities, and verified commit heatmaps.
- **Design System:** PaperCSS tactile newspaper/sketch aesthetic (`Neucha`, `Patrick Hand`, warm parchment `#FEFCF6` / `#F7F3E9`, `#FAF6EC`, hand-drawn borders, dark inked shadows).

## Architecture & Technology Stack
- **Frontend Framework:** React 19 (`19.0.1`) + TypeScript 5.8
- **Build Tool:** Vite 6 (`6.2.3`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss 4.1.14`) + PaperCSS (`1.9.2`) + Custom Hand-Drawn utility classes (`index.css`)
- **Animations & Effects:** Motion (`motion 12.23.24`), `canvas-confetti`
- **Icons:** Lucide React (`lucide-react 0.546.0`)
- **Database & Auth:** Supabase (`@supabase/supabase-js 2.112.4`)
  - GitHub OAuth Provider
  - Row Level Security (RLS) with security definer triggers (`on_auth_user_created`)
  - High-performance composite database indexes on profiles and showcased projects
  - Storage bucket (`avatars`) with CDN and image transformation parameters
  - Client-side offline fallback store if Supabase credentials are in setup/demo mode
- **External APIs:**
  - GitHub REST API v3 / 2022-11-28 (`/users/{username}`, `/user/repos`, `/repos/{owner}/{repo}`)
  - GitHub GraphQL API (`user.contributionsCollection.contributionCalendar`)
  - Public Contribution Event Aggregator & Parser
- **Deployment Platform:** Vercel (SPA rewrites, immutable asset caching with `Cache-Control: public, max-age=31536000, immutable`, strict security headers).

## Performance & Optimization Mechanisms
1. **Multi-Tier Caching Layer (`src/lib/cache.ts`):**
   - L1: In-memory hot cache (`Map<string, CacheEntry<T>>`) for zero-latency component switches.
   - L2: `localStorage` persistence with TTL (`CACHE_TTL`: STATIC 24h, PUBLIC_DATA 10m, USER_SESSION 5m, CONTRIBUTIONS 15m).
   - In-Flight Request Deduplication (`dedupeRequest`): Reuses active Promises to prevent duplicate concurrent network requests.
   - Tagged Cache Invalidation: Automatic invalidation on project add/edit/delete or profile update.
2. **Supabase Storage CDN Image Transformations (`src/lib/storage.ts`):**
   - Supports dimension, quality, format (`webp`, `avif`), and resize transformations.
3. **Vercel Edge Asset Optimization (`vercel.json`):**
   - 1-year immutable caching for static assets, zero-cache revalidation for HTML entrypoint, `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`.

## Verified Application Views & Routes
1. `/` - Front Page / Landing View (Discover Student Projects, Hero Banner, Latest Dispatches, How It Works, Action CTAs).
2. `/explore` - Explore Directory (Search students or projects, Filter by 4 academic programs + Other, Student Grid vs Project Grid toggle, Detail Modals).
3. `/dashboard` - Student Workbench (Manage Published Projects, Pin/Unpin Featured Spotlight, Edit Title & Role Description, Add from Connected GitHub Repos).
4. `/u/:username` - Public Student Showcase Profile (Avatar, Academic Identity, 50-char About Me bio, Technical Cloud, 52-Week Commit Heatmap with live GitHub telemetry, Spotlight Project Cards with Stars/Forks/Topics/Links, Share Profile).
5. Modals:
   - Onboarding / Profile Edit Modal (Full Name, Headline, Program, Year Level, Max 50-character bio).
   - Supabase Guide Modal (Interactive SQL migration runner & OAuth setup instructions).
   - Project Detail Modal (Live stats, stars, forks, language, topics, direct GitHub & live site links).
