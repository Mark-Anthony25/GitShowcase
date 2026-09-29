# GitHub Integration Repair Design

## Goal

Restore reliable GitHub repository selection and live repository statistics for authenticated users without changing the existing dashboard layout or unrelated application behavior.

## Confirmed Cause

The dashboard calls `fetchUserRepos(githubToken, profile.github_username)`. Because a username is present, the helper selects GitHub's public `/users/{username}/repos` endpoint even when an OAuth token exists. This omits private repositories and shares a cache key with anonymous results. Separately, `provider_token` is only read from the transient Supabase callback session and is never retained, so later restored sessions have no GitHub credential. Repository failures are converted to `[]`, which makes an authentication failure indistinguishable from a valid empty account.

## Scope

In scope:

- Keep the GitHub provider token available for the authenticated browser session and clear it on sign-out.
- Fetch authenticated repositories from `/user/repos`; use public-user repositories only when no token is available.
- Separate authenticated and public repository caches without embedding token values in cache keys.
- Return a typed GitHub request failure so the dashboard can show a retryable error instead of an empty state.
- Preserve the existing dashboard UI while adding explicit loading, no-results, search-no-results, and connection-error states.
- Fetch project statistics with the active credential when present and retain anonymous public fallback for public repositories.

Out of scope:

- New OAuth providers, backend token storage, GitHub App migration, pagination beyond the existing 100-repository limit, or dashboard redesign.

## Data Flow

1. On OAuth completion or any auth event carrying `provider_token`, save the token to browser storage and React state.
2. When Supabase restores its session, recover the stored provider token for the same signed-in browser; clear the token whenever the user signs out or changes.
3. The dashboard requests repositories using the authenticated endpoint when a token exists. Without one, it requests the profile's public repositories and marks the result as public-only.
4. GitHub request helpers throw classified request errors rather than returning an empty list on failure. The dashboard renders the existing skeleton while loading, a true empty state for a successful empty response, and a reconnect/retry error state for failed authorization or requests.
5. Live repository-stat requests use the same active token; public repositories may fall back to an anonymous request after an authorization failure. Successful metadata always maps `stargazers_count` to `live_stats.stars`.

## Error Handling

- `401`/`403` for an authenticated repository list is presented as a reconnect message; it does not overwrite a previously loaded list with an empty result.
- Network and GitHub API failures are visible with a retry control.
- An account with no repositories displays a distinct empty message.
- A search that filters an otherwise nonempty list displays a distinct no-match message.
- Missing live statistics remain labeled unavailable only when GitHub has not returned repository metadata; a returned count of zero displays `0`.

## Security and Compatibility

The application already makes GitHub calls in the browser. The provider token remains browser-local, is never included in a cache key, and is removed on sign-out or a user change. No token is written to the database. Supabase documents that provider tokens must be captured at OAuth completion and retained by applications that need provider APIs; it does not refresh them automatically.

## Testing and Acceptance Criteria

- A test proves an authenticated repository request calls `/user/repos` with the bearer token, while an unauthenticated request uses `/users/{username}/repos`.
- A test proves authenticated and public responses use separate cache identities and API errors are not returned as successful empty lists.
- A test proves a GitHub repository response maps a zero or nonzero `stargazers_count` to a visible star count.
- UI tests cover loading, a successful empty repository list, a filtered no-match list, and a retryable connection failure.
- The existing test suite, TypeScript check, and production build pass.
