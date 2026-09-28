# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in student permanently delete their GitShowcase account, profile, showcased projects, and app-local data without affecting GitHub.

**Architecture:** A Supabase Edge Function verifies the calling bearer token and deletes only that Auth user through a server-only service-role client. The React auth context invokes that function, purges the active account’s local mirror, and clears client auth state; `Header` presents the PaperCSS confirmation experience in both account menus.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS v2, Supabase Edge Functions (Deno), PaperCSS, Lucide, `tsx` source-level regression tests.

**Spec:** `docs/superpowers/specs/2026-09-28-account-deletion-design.md`

## Global Constraints

- Delete only the current GitShowcase/Supabase user; never delete GitHub data or repositories.
- Keep the Supabase service-role key server-only in the Edge Function environment.
- Require the exact confirmation text `DELETE` before account removal is enabled.
- Preserve the signed-in state on a remote deletion failure and show a retryable error.
- Keep the confirmation UI consistent with the existing PaperCSS palette, irregular borders, and dialog patterns.
- In local fallback mode, remove only the active local profile and its local projects.

## Review Focus

- An empty, mixed-case, or spaced confirmation string must keep deletion disabled; test the exact-match guard in the header UI test.
- A forged or absent bearer token must not reach `auth.admin.deleteUser`; test the Edge Function’s caller lookup and unauthorized response path.
- A valid request must delete only the authenticated user ID, never a client-supplied ID; test the source’s use of `caller.id`.
- An Edge Function error must leave the active session and local profile intact; test `deleteAccount()`’s success-only state clearing contract.
- Local fallback deletion must remove the selected profile’s projects without changing other profiles; test the scoped store purge helper.

---

### Task 1: Add the protected Supabase account-deletion endpoint

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Test: `src/context/__tests__/accountDeletion.test.ts`

**Interfaces:**
- Consumes: `Authorization: Bearer <access token>` supplied by `supabase.functions.invoke('delete-account')`.
- Produces: `DELETE /functions/v1/delete-account` responses of `204`, `401`, or a sanitized `500` JSON error; no user ID is accepted in the request body.

- [ ] **Step 1: Write the failing Edge Function source assertion test**

```ts
assert.match(edgeFunction, /auth\.getUser\(token\)/);
assert.match(edgeFunction, /auth\.admin\.deleteUser\(caller\.id\)/);
assert.doesNotMatch(edgeFunction, /deleteUser\(.*body/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx src/context/__tests__/accountDeletion.test.ts`

Expected: FAIL because the Edge Function does not exist.

- [ ] **Step 3: Implement `delete-account` in `supabase/functions/delete-account/index.ts`**

Create a Deno `serve` handler that accepts `OPTIONS`, extracts the bearer token, uses an anon-key Supabase client to call `auth.getUser(token)`, and returns `401` if no caller is resolved. Create a second client with `SUPABASE_SERVICE_ROLE_KEY` solely to call `auth.admin.deleteUser(caller.id)`. Return `204` on success and a generic `500` response on failure; add the CORS headers required by the browser invocation. Do not log tokens or return Auth-user data.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx src/context/__tests__/accountDeletion.test.ts`

Expected: PASS, confirming caller-derived deletion and service-key confinement.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/delete-account/index.ts src/context/__tests__/accountDeletion.test.ts
git commit -m "feat(auth): add protected account deletion endpoint"
```

### Task 2: Add scoped local-data removal and an AuthContext deletion command

**Files:**
- Modify: `src/lib/showcaseStore.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/context/__tests__/accountDeletion.test.ts`

**Interfaces:**
- Consumes: `deleteAccount(): Promise<void>` called by authenticated presentation code.
- Produces: `purgeStudentShowcaseData(profileId: string, username?: string): void` and `deleteAccount()` on `AuthContextType`.

- [ ] **Step 1: Extend the failing test for the client and local purge contracts**

```ts
assert.match(authContext, /deleteAccount:\s*\(\)\s*=>\s*Promise<void>/);
assert.match(authContext, /supabase\.functions\.invoke\('delete-account'\)/);
assert.match(store, /export function purgeStudentShowcaseData\(profileId: string/);
assert.match(store, /projects\.filter\(p => p\.profile_id !== profileId\)/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx src/context/__tests__/accountDeletion.test.ts`

Expected: FAIL because neither public client interface exists.

- [ ] **Step 3: Implement `purgeStudentShowcaseData(profileId, username?)` in `src/lib/showcaseStore.ts`**

Remove only the matching profile and projects from the local store, then call `invalidateShowcaseCaches(profileId, username)`. Do not clear `custom_supabase_url`, `custom_supabase_anon_key`, unrelated profiles, or shared repository cache entries.

- [ ] **Step 4: Implement `deleteAccount(): Promise<void>` in `src/context/AuthContext.tsx`**

Require a current `user`. When Supabase is configured, await `supabase.functions.invoke('delete-account')` and throw its error before changing local state. Then call `purgeStudentShowcaseData(user.id, profile?.github_username)`, call `supabase.auth.signOut()` when available, and clear user, session, profile, and GitHub token state. Add the method to `AuthContextType` and provider value.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx src/context/__tests__/accountDeletion.test.ts`

Expected: PASS, confirming the endpoint call, success ordering, and scoped purge.

- [ ] **Step 6: Commit**

```bash
git add src/lib/showcaseStore.ts src/context/AuthContext.tsx src/context/__tests__/accountDeletion.test.ts
git commit -m "feat(auth): remove account data after verified deletion"
```

### Task 3: Build the PaperCSS account-deletion confirmation flow

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/__tests__/authEntryUi.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `deleteAccount(): Promise<void>` from `useAuth()`.
- Produces: Desktop and mobile `Delete Account` actions and a stateful, accessible confirmation dialog.

- [ ] **Step 1: Write failing UI source assertions**

```ts
assert.match(header, /id="delete-account-btn"/);
assert.match(header, /id="mobile-delete-account-btn"/);
assert.match(header, /aria-label="Delete Account Confirmation"/);
assert.match(header, /confirmationText === 'DELETE'/);
assert.match(header, /Delete Account Permanently/);
```

Also assert the account-deletion test is appended to the `test` script.

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `npx tsx src/components/__tests__/authEntryUi.test.ts`

Expected: FAIL because account-deletion controls and dialog state are absent.

- [ ] **Step 3: Implement the confirmation dialog in `src/components/Header.tsx`**

Add local state for dialog visibility, confirmation text, pending status, and error. Add a separated destructive action to the desktop dropdown and mobile menu. Render one PaperCSS-styled modal with an irregular paper card, dismiss controls, Escape/backdrop handling, an exact `DELETE` input, a disabled-until-valid destructive button, and a visible error area. On successful `await deleteAccount()`, close navigation state and navigate to `/`; leave the dialog open with its error on failure. State plainly that GitHub itself is unaffected.

- [ ] **Step 4: Register and run the focused UI tests**

Run: `npx tsx src/components/__tests__/authEntryUi.test.ts && npx tsx src/context/__tests__/accountDeletion.test.ts`

Expected: PASS, including PaperCSS modal, exact confirmation guard, both menu entry points, and protected client flow.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/__tests__/authEntryUi.test.ts package.json
git commit -m "feat(ui): add PaperCSS account deletion confirmation"
```

### Task 4: Verify the completed account-deletion feature

**Files:**
- Verify: `supabase/functions/delete-account/index.ts`
- Verify: `src/lib/showcaseStore.ts`
- Verify: `src/context/AuthContext.tsx`
- Verify: `src/components/Header.tsx`

**Interfaces:**
- Consumes: the completed tasks.
- Produces: evidence that the repository accepts the account-deletion change without regressions.

- [ ] **Step 1: Run the focused account-deletion checks**

Run: `npx tsx src/context/__tests__/accountDeletion.test.ts && npx tsx src/components/__tests__/authEntryUi.test.ts`

Expected: PASS.

- [ ] **Step 2: Run repository checks**

Run: `npm run lint && npm test && npm run build && git diff --check`

Expected: all checks pass; a Vite large-chunk warning may remain non-blocking if it is unchanged from baseline.

- [ ] **Step 3: Review deployed-environment requirement**

Record that the endpoint is operational only after deployment with `SUPABASE_SERVICE_ROLE_KEY` configured as an Edge Function secret, e.g. `supabase functions deploy delete-account`. Do not add the secret to source control.
