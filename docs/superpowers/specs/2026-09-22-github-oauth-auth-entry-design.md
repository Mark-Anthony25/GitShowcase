# GitHub OAuth Callback and Account Entry Design

## Goal

Make GitHub authorization reliably establish a Supabase session in the web app, then clearly distinguish returning-user sign-in from new-user sign-up.

## Context and Root Cause

The current client starts GitHub OAuth in a named popup with `skipBrowserRedirect: true`. After the provider redirects the popup to `/dashboard`, popup-only effects wait 500 ms, post a generic success message to the opener, and close the popup. The opener then tries to read a session.

This makes session completion dependent on a timing race between the PKCE code exchange, popup storage updates, opener session reads, and popup closure. PKCE authorization codes are one-time values and must be exchanged in the browser context that initiated the flow. A top-level redirect removes this cross-window handoff entirely.

## Scope

In scope:

- GitHub OAuth initiation and callback/session handling in the client.
- A dedicated `/auth/callback` route.
- Distinct sign-in and sign-up entry routes and controls.
- Regression tests for callback behavior and account-entry UI.

Out of scope:

- New auth providers, email/password credentials, or database-schema changes.
- Changes to GitHub scopes, repository access, profile seeding, onboarding fields, or authenticated dashboard behavior.

## Authentication Flow

1. A user selects either **Sign In with GitHub** or **Sign Up with GitHub**.
2. `signInWithGitHub` requests GitHub OAuth with `redirectTo` set to `${window.location.origin}/auth/callback`; it uses the browser's normal top-level redirect rather than opening a popup.
3. GitHub and Supabase return the browser to `/auth/callback?code=...`.
4. The callback handler reads the OAuth code and explicitly calls `supabase.auth.exchangeCodeForSession(code)` exactly once. Automatic URL session detection is disabled so two handlers cannot race to exchange the same code.
5. On success, the session is persisted by the Supabase client, callback query parameters are removed, and the browser is redirected to `/dashboard`.
6. On failure, the callback URL is cleaned and a concise authentication error is surfaced on the sign-in screen. The user can safely restart OAuth.
7. `onAuthStateChange` remains responsible for synchronizing the React user/session/profile state. A provider token is captured when supplied, and profile loading stays outside the code-exchange logic.

## Account Entry UX

The application exposes two routes for unauthenticated users:

- `/signin` is for returning users. It explains that GitHub verifies the existing account and its GitHub control reads **Continue with GitHub**.
- `/signup` is for new users. It explains that GitHub creates the portfolio account on first authorization and its GitHub control reads **Create account with GitHub**. It also states that an existing account will be signed in rather than duplicated.

Both routes use the same OAuth mechanism. Account creation continues to be determined by the existing profile-seeding behavior after Supabase supplies an authenticated user without a profile.

The public header and landing page provide separate controls: **Sign In** routes to `/signin`; **Create Portfolio** routes to `/signup`. The dashboard's unauthenticated gate uses the sign-in variant. Existing authenticated navigation remains unchanged.

## Error Handling and Safety

- Callback code exchange errors never leave a code or provider error in the address bar.
- OAuth error copy remains user-facing and does not reveal secrets or dashboard configuration instructions.
- The callback redirects only to the same-origin dashboard; no caller-provided return URL is honored.
- A missing Supabase configuration retains the existing configuration-guide behavior before attempting OAuth.

## Testing and Acceptance Criteria

- A unit test proves callback parsing accepts a valid `code` and ignores unrelated query parameters.
- A callback test proves a successful exchange stores the session path and redirects to `/dashboard`; a failed exchange cleans the URL and exposes a retryable error.
- Browser/UI coverage proves `/signin` and `/signup` render distinct titles, explanatory copy, and GitHub CTA labels; it also proves their public entry controls route correctly.
- The project test suite and production build pass.
- Manual acceptance: authorize an already-existing GitHub account, then verify the original browser tab lands at `/dashboard` authenticated, with no popup window left open. Repeat for a first-time GitHub account and verify onboarding starts after the dashboard loads.
