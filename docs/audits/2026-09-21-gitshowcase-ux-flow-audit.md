# GitShowcase UX Flow Audit

Date: 2026-09-21

## Flow audited

Guest user enters the landing page, chooses Browse Projects, switches between Students and Projects, searches, opens a public profile, and attempts to reach the portfolio/project-creation path.

## Overall verdict

The intended path is easy to understand at the entry point, but it breaks at the two moments that should prove product value: discovery returns zero content, and a profile deep link remains in loading state. The experience needs stronger state recovery before adding more discovery features.

## Step health

1. **Landing → Browse Projects — Fair.** The primary CTA is obvious and reaches `/explore`, but the page promises discovery while showing no featured work.
2. **Browse Students/Projects — Fair.** The mode switch is understandable and updates the heading and result state. Counts of zero make the product feel inactive.
3. **Search/filter — Fair.** Search updates immediately and the program filter is available, but feedback is generic and does not explain whether there is no data or simply no match.
4. **Browse → Public profile — Poor / blocked.** The profile route displays skeleton loading and does not resolve to profile content, a not-found state, or an error recovery action.
5. **Dashboard / portfolio creation — Poor for deep links.** `/dashboard` returns the user to the landing page when signed out, with no explanation that the requested workspace requires GitHub sign-in.

## Main UX findings

### 1. Discovery value is not demonstrated

The flow asks users to browse before showing any student or project. This creates a dead end immediately after the strongest CTA. Seed a few representative projects in demo/empty environments, or replace the empty region with a clear campus call-to-action such as “Be the first ISU student to publish.”

### 2. Search cannot help users recover

After entering “capstone,” the result message remains “No projects found. Try adjusting your query or selecting another program.” It does not echo the query, show active filters, suggest clearing only the search, or explain whether the directory itself is empty. Add result counts, active-filter chips, and contextual empty copy.

### 3. Profile navigation loses user intent

The profile URL loads a skeleton but provides no progress boundary. A user cannot tell whether they should wait, retry, correct the username, or return to search. Add a timeout-backed error state with “Retry,” “Back to browse,” and a distinct “Profile not found” state.

### 4. Protected workspace is not explained

Navigating directly to `/dashboard` silently renders the public landing page. This is safe but confusing: the requested destination disappears. Preserve intent with an auth gate that says the project desk requires GitHub sign-in and offers one clear next action.

### 5. The flow has no successful branch in the current environment

Because there are no seeded records and no authenticated session, the audit could not verify the happy path from browse result → profile → project detail → external GitHub/live site. That is itself a usability risk for first-run evaluation: the core loop cannot be demonstrated.

## Recommended sequence of fixes

1. Add deterministic demo/seed data for the guest discovery path.
2. Implement explicit loading, not-found, unavailable, and retry states for profiles.
3. Add route-aware sign-in gating for `/dashboard`.
4. Make empty search results contextual with counts, active filters, and targeted reset actions.
5. Re-run the full happy path with a seeded authenticated session, including project detail and external-link handoff.

## Evidence limits

This is a UX-flow audit based on fresh browser captures and accessibility snapshots. It does not verify authenticated onboarding, GitHub OAuth completion, project creation, populated project details, mobile behavior, or assistive-technology announcements.
