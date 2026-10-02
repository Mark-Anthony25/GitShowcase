# Free-tier public directory design

## Goal

Support a public GitShowcase directory of up to 500 profiles, 1,500 showcased repositories, and roughly 100 concurrent visitors without loading the whole directory or issuing GitHub requests for every card. Preserve the current UI and remain within Vercel Hobby and Supabase Free constraints.

## Constraints

- Public reads go directly from the browser to Supabase through RLS.
- Vercel remains static-first; the existing API proxy is removed rather than expanded.
- GitHub tokens never reach browser storage. A Supabase Edge Function alone uses `GITHUB_TOKEN`.
- No background polling. Repository metadata refresh happens only when a mutation requests it or a stale repository is viewed.
- A stale cache row is a valid response when GitHub is unavailable or rate limited.

## Public data flow

`getPublicDirectoryPage` queries `showcased_projects` as the listing root, joining the required profile fields and `repo_stats_cache`. It selects explicit columns only, filters search/program before paging, orders by `added_at DESC, id DESC`, and returns 24 rows plus `hasMore` by requesting one extra row. Search is debounced by 250 ms in Explore. Landing uses the same function with a six-card limit.

Public profiles fetch one profile by canonical GitHub username and its at-most-three projects with the same cache join. Neither public page calls GitHub directly.

The listing index starts with `added_at DESC` because all showcased projects are public in the current data model. An indexed profile program field supports the program filter. Search is initially a case-insensitive prefix/contains match over a deliberately small dataset; a trigram/full-text index is deferred until measured query plans require it.

## Repository metadata cache

`repo_stats_cache` gains the display fields used by cards: description, homepage, topics, and `refresh_after`. A stale row is displayed immediately. The client may invoke `refresh-repo-stats` only for a single displayed or newly added repository, and only when `refresh_after <= now()`; the function independently verifies this condition.

The Edge Function reads `GITHUB_TOKEN` from Supabase secrets, handles `403`/`429`, parses `Retry-After`, and advances `refresh_after` after failed requests so a burst cannot repeatedly hit GitHub. It returns the existing cache row if one exists. It writes with the service role and no ordinary user can insert, update, or delete cache rows.

Dashboard repository selection remains available through a dedicated Edge Function that calls GitHub with the server-only token for the authenticated caller's public repositories. Private repositories are not imported under the reduced `read:user` OAuth scope. GitHub HTML scraping, Shields calls, the Vercel proxy, and browser-held provider tokens are removed.

## Integrity and mutations

Migration introduces `repo_key` as a lower-case normalized repository identifier. A unique constraint on `(profile_id, repo_key)` is the exact conflict target. A `save_showcased_project` RPC validates the caller, canonicalizes the key, and locks/counts the caller's current projects before insert, so the three-project limit is race-safe. The function returns the saved row or a stable error code.

Client mutations use this RPC and throw on any Supabase failure. Local storage remains only for explicitly unconfigured demo mode; it is not a production write fallback. Existing owner update/delete policies use both `USING` and `WITH CHECK` with `(select auth.uid())`.

## Auth, storage, and frontend delivery

GitHub OAuth requests only `read:user`. Supabase session persistence remains intact, while `provider_token` is neither retained nor read from `localStorage`/`sessionStorage`. Avatar upload allows JPEG, PNG, and WebP up to 5 MB, checks decoded dimensions, and overwrites `avatars/<user-id>/avatar.<extension>` with a long cache control value. Display URLs use transformed responsive widths and lazy loading.

`DashboardView` and `OnboardingModal` are route-lazy; confetti is dynamically imported on the successful publish path. Static assets retain immutable caching. `vercel.json` applies CSP, frame ancestry, referrer, MIME, and permissions headers to all routes, while allowing the configured Supabase project, GitHub OAuth, GitHub avatars, and inline styles required by the existing app.

## Verification

- Unit tests prove pagination caps, debounced directory request behavior, cache freshness/stale-on-error behavior, no browser GitHub statistics fetches, failed-write propagation, avatar validation, and client-visible mutation errors.
- SQL migration includes comments for the one-time backfill and is applied in a separate Supabase project before production.
- Typecheck, test suite, and production build must pass.
- A preview deployment header check confirms the required headers. Production and dashboard state are explicitly reported as unverified without access.

## Required configuration

- Supabase Edge Function secrets: `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Deploy the migration and both Edge Functions through Supabase CLI/Dashboard.
- Configure GitHub OAuth redirect URL in Supabase and GitHub as the deployed `/auth/callback` URL.
