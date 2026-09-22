# GitHub OAuth Callback and Account Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete GitHub OAuth in the initiating browser tab and give returning and new users separate, explicit account entry paths.

**Architecture:** A small pure callback module owns OAuth-code parsing and exchange outcomes. `AuthProvider` invokes it only on `/auth/callback`, writes a safe one-time error message to session storage when needed, and uses full-page same-origin redirects to transition to `/dashboard` or `/signin`. The existing `AuthGateView` becomes mode-aware and is routed at `/signin` and `/signup`; no user-profile or database behavior changes.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS 2, Playwright, `tsx` test scripts.

**Spec:** `docs/superpowers/specs/2026-09-22-github-oauth-auth-entry-design.md`

## Global Constraints

- Use GitHub OAuth scopes `read:user repo` exactly as today.
- Do not open a popup or use `skipBrowserRedirect` for GitHub OAuth.
- Set `detectSessionInUrl: false`; `/auth/callback` is the only application code-exchange path.
- Persist callback failures in `sessionStorage`, never in query parameters or local storage.
- Use only same-origin `/auth/callback`, `/signin`, `/signup`, and `/dashboard` redirects.
- Preserve existing Supabase configuration-guide behavior and profile seeding/onboarding behavior.
- Do not add auth providers, credentials, or schema changes.

## Review Focus

- Missing or malformed callback code must route to `/signin` with a retryable error and no lingering callback query string.
- An exchange failure must not retry or reuse the one-time authorization code.
- Successful sign-in must preserve the provider token path used for GitHub API requests after the dashboard reloads.
- Existing GitHub identities selected from the sign-up screen must sign in normally rather than create a duplicate app account.
- The public header, mobile menu, landing page, direct route, and unauthenticated dashboard must expose the correct entry intent.

---

### Task 1: Extract and test callback outcome logic

**Files:**
- Create: `src/lib/authCallback.ts`
- Create: `src/lib/__tests__/authCallback.test.ts`
- Modify: `package.json:6-13`

**Interfaces:**
- Produces `getOAuthCallbackCode(search: string): string | null`.
- Produces `completeOAuthCallback(search: string, exchangeCode: (code: string) => Promise<{ error: { message: string } | null }>): Promise<{ status: 'success' } | { status: 'invalid-callback'; message: string } | { status: 'exchange-failed'; message: string }>`.
- `AuthProvider` consumes the outcome and decides routing/storage; the helper never reads browser globals.

- [ ] **Step 1: Write the failing callback tests**

```ts
import { completeOAuthCallback, getOAuthCallbackCode } from '../authCallback';

async function runTests() {
  if (getOAuthCallbackCode('?state=kept&code=abc-123') !== 'abc-123') {
    throw new Error('Callback code was not read from the query string');
  }
  if (getOAuthCallbackCode('?state=kept') !== null) {
    throw new Error('Callback accepted a request without an OAuth code');
  }

  let exchangedCode = '';
  const success = await completeOAuthCallback('?code=one-time-code', async (code) => {
    exchangedCode = code;
    return { error: null };
  });
  if (success.status !== 'success' || exchangedCode !== 'one-time-code') {
    throw new Error('Callback did not exchange its single returned code');
  }

  const failure = await completeOAuthCallback('?code=expired-code', async () => ({
    error: { message: 'Code has expired' },
  }));
  if (failure.status !== 'exchange-failed' || !failure.message.includes('Please try again')) {
    throw new Error('Callback did not expose a retryable exchange failure');
  }
}

runTests().catch((error) => { console.error(error); process.exit(1); });
```

- [ ] **Step 2: Register and run the new test to verify it fails**

Update the `test` script so `tsx src/lib/__tests__/authCallback.test.ts` runs before the existing cache test, then run:

```powershell
npx tsx src/lib/__tests__/authCallback.test.ts
```

Expected: FAIL because `src/lib/authCallback.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure callback module**

```ts
export function getOAuthCallbackCode(search: string): string | null {
  return new URLSearchParams(search).get('code');
}

export async function completeOAuthCallback(
  search: string,
  exchangeCode: (code: string) => Promise<{ error: { message: string } | null }>,
) {
  const code = getOAuthCallbackCode(search);
  if (!code) {
    return { status: 'invalid-callback' as const, message: 'GitHub did not return an authorization code. Please try again.' };
  }

  const { error } = await exchangeCode(code);
  return error
    ? { status: 'exchange-failed' as const, message: 'GitHub sign-in could not be completed. Please try again.' }
    : { status: 'success' as const };
}
```

Keep the provider error out of the returned user-facing result; production logging may retain it separately.

- [ ] **Step 4: Run the focused test and full unit suite**

```powershell
npx tsx src/lib/__tests__/authCallback.test.ts
npm test
```

Expected: all callback assertions and all existing tests pass.

- [ ] **Step 5: Commit the callback foundation**

```powershell
git add package.json src/lib/authCallback.ts src/lib/__tests__/authCallback.test.ts
git commit -m "test: cover OAuth callback outcomes"
```

### Task 2: Complete OAuth in a dedicated same-tab callback route

**Files:**
- Modify: `src/lib/supabase.ts:35-45`
- Modify: `src/context/AuthContext.tsx:1-250`
- Modify: `src/App.tsx:1-135`
- Create: `src/components/AuthCallbackView.tsx`
- Modify: `src/lib/__tests__/authCallback.test.ts`
- Create: `playwright.config.ts`
- Create: `tests/auth-callback.spec.ts`
- Modify: `package.json:6-13`

**Interfaces:**
- Consumes `completeOAuthCallback` from Task 1.
- Produces `AuthProvider` behavior for `/auth/callback`: exchange once, write `gitshowcase_auth_error` only on failure, and navigate with `window.location.replace`.
- Produces an `AuthCallbackView` with only an in-progress status while the provider completes the redirect.

- [ ] **Step 1: Write a failing callback-route regression test**

```ts
import { test, expect } from 'playwright/test';

test('callback without a configured client returns to sign-in without OAuth parameters', async ({ page }) => {
  await page.goto('/auth/callback?code=one-time-code');
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByText(/not configured yet/i)).toBeVisible();
});
```

- [ ] **Step 2: Add Playwright configuration and verify the test fails**

```powershell
npm run test:auth-ui -- --grep "callback without a configured client"
```

Create `playwright.config.ts` with `testDir: './tests'`, `baseURL: 'http://127.0.0.1:4173'`, and a Vite `webServer` command `npm run dev -- --port 4173 --host 127.0.0.1`; add `"test:auth-ui": "playwright test"` to `package.json`.

Expected: FAIL because `/auth/callback` currently falls through to the landing page.

- [ ] **Step 3: Update the Supabase client and provider**

Set `detectSessionInUrl: false` in `src/lib/supabase.ts`. In the first initialization path of `AuthProvider`, before calling `getSession` or registering `onAuthStateChange`, branch on `window.location.pathname === '/auth/callback'`. Call `completeOAuthCallback(window.location.search, (code) => supabase.auth.exchangeCodeForSession(code))`.

For `success`, call `window.location.replace('/dashboard')`. For an invalid or failed callback, call `sessionStorage.setItem('gitshowcase_auth_error', result.message)` and `window.location.replace('/signin')`. If `supabase` is unavailable, persist `GitHub sign-in is not configured yet.` and redirect to `/signin`. Do not register the legacy popup message listener or popup-closing effect.

Change `signInWithGitHub` to:

```ts
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    scopes: 'read:user repo',
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

Read `gitshowcase_auth_error` once in the existing auth-error initialization effect, set `authError`, then remove the key. Continue recognizing provider-supplied `error` and `error_description` values, but clean their URL with `history.replaceState`.

- [ ] **Step 4: Add the callback route status view**

Create `AuthCallbackView` with an accessible heading `Completing GitHub sign-in` and a short message that the user will be redirected. In `App.tsx`, render it for `/auth/callback` before the normal landing fallback, so callback URLs never display the public landing page during code exchange.

- [ ] **Step 5: Run focused and type checks**

```powershell
npx tsx src/lib/__tests__/authCallback.test.ts
npm run lint
```

Expected: callback tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit the reliable OAuth flow**

```powershell
git add package.json playwright.config.ts tests/auth-callback.spec.ts src/lib/supabase.ts src/context/AuthContext.tsx src/App.tsx src/components/AuthCallbackView.tsx src/lib/__tests__/authCallback.test.ts
git commit -m "fix: complete GitHub OAuth in callback route"
```

### Task 3: Add distinct sign-in and sign-up routes and entry controls

**Files:**
- Modify: `src/components/AuthGateView.tsx:1-70`
- Modify: `src/components/Header.tsx:1-345`
- Modify: `src/components/LandingView.tsx:1-270`
- Modify: `src/App.tsx:35-75`
- Create: `tests/auth-entry.spec.ts`

**Interfaces:**
- `AuthGateView` consumes `mode: 'signin' | 'signup'` and renders intent-specific copy while calling the same `signInWithGitHub` function.
- `AppContent` maps `/signin` to `mode="signin"`, `/signup` to `mode="signup"`, and keeps unauthenticated `/dashboard` on `mode="signin"`.
- `npm run test:auth-ui -- --grep "sign-in route|sign-up route|public entry controls"` runs the visitor-only account-entry regression subset.

- [ ] **Step 1: Write failing browser tests for account entry**

```ts
import { test, expect } from 'playwright/test';

test('sign-in route is clearly for returning users', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.getByText(/returning/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
});

test('sign-up route explains existing accounts and uses a creation CTA', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /create your portfolio/i })).toBeVisible();
  await expect(page.getByText(/existing account will be signed in/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /create account with github/i })).toBeVisible();
});

test('public entry controls route visitors to their matching account intent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await page.goto('/');
  await page.getByRole('link', { name: /create portfolio/i }).click();
  await expect(page).toHaveURL(/\/signup$/);
});
```

- [ ] **Step 2: Run the account-entry tests to verify they fail**

```powershell
npm run test:auth-ui -- --grep "sign-in route|sign-up route|public entry controls"
```

Expected: FAIL because `/signin`, `/signup`, and their intent-specific controls do not exist.

- [ ] **Step 3: Implement explicit entry modes**

Update `AuthGateView` with a required `mode` prop. For sign-in, render `Sign In to Your Project Desk`, `Returning to GitShowcase? Continue with the GitHub account you already use.`, and `Continue with GitHub`. For sign-up, render `Create Your Portfolio`, `New here? GitHub creates your portfolio account on first sign-in.`, `Already have an account? You will be signed in instead.`, and `Create account with GitHub`.

In `App.tsx`, route `/signin` and `/signup` to the matching mode. Preserve the dashboard gate as sign-in. Replace the unauthenticated header controls (desktop and mobile) with navigation links/buttons for **Sign In** (`/signin`) and **Create Portfolio** (`/signup`). Replace the public landing action area with the same two destinations, using semantic anchors whose `href` values remain usable without JavaScript.

- [ ] **Step 4: Run the account-entry regression suite**

```powershell
npm run test:auth-ui -- --grep "sign-in route|sign-up route|public entry controls"
```

Expected: all three visitor tests pass.

- [ ] **Step 5: Commit the account-entry UX**

```powershell
git add src/components/AuthGateView.tsx src/components/Header.tsx src/components/LandingView.tsx src/App.tsx tests/auth-entry.spec.ts
git commit -m "feat: separate GitHub sign-in and sign-up"
```

### Task 4: Verify the integrated flow

**Files:**
- Modify only if a failing verification exposes a task-scoped defect.

**Interfaces:**
- Verifies all interfaces from Tasks 1–3 without adding behavior.

- [ ] **Step 1: Run all automated checks**

```powershell
npm run lint
npm test
npm run test:auth-ui
npm run build
```

Expected: every command exits successfully.

- [ ] **Step 2: Run the manual GitHub acceptance checks**

1. In a browser with an existing GitHub account, open `/signin` and select **Continue with GitHub**.
2. Finish GitHub authorization and confirm the same tab—not a popup—lands at `/dashboard` with the authenticated header and account menu.
3. Sign out, then repeat from `/signup` using a first-time GitHub account.
4. Confirm the same tab lands at `/dashboard` and the existing onboarding modal opens for the seeded profile.
5. Simulate a canceled or invalid provider return and confirm `/signin` shows a retryable error without callback parameters in the address bar.

- [ ] **Step 3: Inspect the final change set**

```powershell
git diff HEAD~3..HEAD --check
git status --short
```

Expected: no whitespace errors and no unintended files.

- [ ] **Step 4: Commit any verification-only correction, if required**

```powershell
git add src/context/AuthContext.tsx src/lib/supabase.ts src/components/AuthGateView.tsx src/components/Header.tsx src/components/LandingView.tsx src/App.tsx src/lib/authCallback.ts src/lib/__tests__/authCallback.test.ts tests/auth-callback.spec.ts tests/auth-entry.spec.ts package.json playwright.config.ts
git commit -m "fix: address OAuth flow verification"
```

Do not create this commit when all checks pass without changes.
