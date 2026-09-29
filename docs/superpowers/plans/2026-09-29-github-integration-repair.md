# GitHub Integration Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore authenticated GitHub repository selection and live star counts while making the existing dashboard distinguish loading, empty, filtered, and failed repository requests.

**Architecture:** Keep provider credentials browser-local in the existing auth context. Make the GitHub helper select an authenticated endpoint and cache identity from token presence, report request failures to its caller, and let the dashboard retain its existing UI while rendering the right state.

**Tech Stack:** React 19, TypeScript, Supabase JS, GitHub REST API, tsx test scripts.

**Spec:** `docs/superpowers/specs/2026-09-29-github-integration-repair-design.md`

## Global Constraints

- Do not add dependencies, backend token storage, or change the dashboard layout.
- Never include a provider-token value in a cache key or database record.
- Clear the browser-local GitHub token on sign-out or a user change.
- Preserve public repository and live-stat fallback for unauthenticated browsing.

## Review Focus

- Restored Supabase sessions without `provider_token` must recover the browser-local token only for the same signed-in user.
- A `401` or `403` must display a retryable connection failure, not a successful empty repository list.
- A returned star count of `0` must render `0`, not `Not available`.
- An authenticated response must never be satisfied by a cached anonymous response.
- A search with no matches must not claim the GitHub account has no repositories.

---

### Task 1: Make GitHub repository requests observable and correctly authenticated

**Files:**
- Modify: `src/lib/github.ts`
- Create: `src/lib/__tests__/github.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `fetchUserRepos(githubToken?: string | null, username?: string | null, forceRefresh?: boolean): Promise<GitHubRepoItem[]>` using `/user/repos` when `githubToken` is present and `/users/{username}/repos` otherwise.
- Produces: an exported request-error type or classifier the dashboard can use to display authentication and network failures.

- [ ] **Step 1: Write failing tests for authenticated endpoint selection and cache separation**

Create a `github.test.ts` script that stubs `globalThis.fetch`, calls `fetchUserRepos('token', 'octocat', true)`, and asserts the URL contains `/user/repos`, the request has `Authorization: Bearer token`, and a subsequent anonymous lookup requests `/users/octocat/repos` rather than receiving the authenticated result.

- [ ] **Step 2: Run the GitHub helper test to verify it fails**

Run: `npx tsx src/lib/__tests__/github.test.ts`

Expected: FAIL because the current authenticated call selects the public user endpoint or shares its cache identity.

- [ ] **Step 3: Implement the minimal endpoint, cache-key, and error behavior in `src/lib/github.ts`**

Use a cache scope based only on authenticated versus public access. Preserve the existing GitHub headers and public fallback for live stats. Do not swallow a non-success repository-list response into `[]`; throw a classified error after any permitted public fallback fails.

- [ ] **Step 4: Add a failing live-stat mapping assertion, then make it pass**

Extend `github.test.ts` to return `{ stargazers_count: 0 }` from a repository response and assert `fetchLiveRepoStats('octocat/hello-world', 'token', true)` returns `stars === 0`. Implement only any normalization needed for that observable result.

- [ ] **Step 5: Run the GitHub helper test to verify it passes**

Run: `npx tsx src/lib/__tests__/github.test.ts`

Expected: PASS.

- [ ] **Step 6: Add the new test to the project test command and commit**

Run: `npm test`

Expected: PASS.

```bash
git add src/lib/github.ts src/lib/__tests__/github.test.ts package.json
git commit -m "fix: restore authenticated GitHub repository access"
```

### Task 2: Persist the active GitHub provider credential with the browser session

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Create: `src/context/__tests__/githubTokenSession.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the existing `githubToken` context value and Supabase auth events.
- Produces: the active provider token after OAuth and a restored same-user browser session, or `null` after sign-out/user change.

- [ ] **Step 1: Write a failing token-session regression test**

Extract only the token-storage read/write/clear logic needed to exercise it without React. Assert a saved token is restored for the matching user ID, rejected for a different user ID, and cleared on sign-out.

- [ ] **Step 2: Run the token-session test to verify it fails**

Run: `npx tsx src/context/__tests__/githubTokenSession.test.ts`

Expected: FAIL because no same-user provider-token storage exists.

- [ ] **Step 3: Implement minimal browser-local token storage and auth synchronization**

Persist a provider token only when Supabase supplies it. On restored sessions, recover it only when the stored owner matches `session.user.id`; otherwise clear it. Always set `githubToken` to `null` when no valid token is available, and clear storage in sign-out and account deletion paths.

- [ ] **Step 4: Run the token-session test to verify it passes**

Run: `npx tsx src/context/__tests__/githubTokenSession.test.ts`

Expected: PASS.

- [ ] **Step 5: Add the test to the project test command and commit**

Run: `npm test`

Expected: PASS.

```bash
git add src/context/AuthContext.tsx src/context/__tests__/githubTokenSession.test.ts package.json
git commit -m "fix: retain GitHub provider token for active session"
```

### Task 3: Distinguish repository loading, empty, filtered, and failed states

**Files:**
- Modify: `src/components/DashboardView.tsx`
- Create: `src/components/__tests__/githubRepositoryStates.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: GitHub request failures from Task 1 and `githubToken` from Task 2.
- Produces: repository-tab state that retains successful results on failure and renders a retryable error, a successful empty-account message, or a search no-match message.

- [ ] **Step 1: Write a failing UI-source regression test for state coverage**

Create `githubRepositoryStates.test.ts` using the project’s existing source-level UI test convention. Require `DashboardView.tsx` to track a repository error, expose a retry action, and include distinct copy for failed loading, zero repositories, and no search matches.

- [ ] **Step 2: Run the UI-state test to verify it fails**

Run: `npx tsx src/components/__tests__/githubRepositoryStates.test.ts`

Expected: FAIL because the dashboard logs request failures and renders all zero-length results as a search miss.

- [ ] **Step 3: Implement the smallest state and copy changes in `DashboardView.tsx`**

Set and clear repository errors around `loadGitHubRepos`. Keep the existing skeleton. Render the error with a retry button when a request fails, the account-empty message after a successful empty request with no search text, and the current search-miss message only when a query filters an existing result set.

- [ ] **Step 4: Run the UI-state test to verify it passes**

Run: `npx tsx src/components/__tests__/githubRepositoryStates.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the full verification set and commit**

Run: `npm test && npm run lint && npm run build`

Expected: all commands exit 0.

```bash
git add src/components/DashboardView.tsx src/components/__tests__/githubRepositoryStates.test.ts package.json
git commit -m "fix: clarify GitHub repository loading states"
```
