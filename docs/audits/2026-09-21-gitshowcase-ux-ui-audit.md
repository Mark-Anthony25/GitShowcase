# GitShowcase UX/UI Audit

Date: 2026-09-21

## Audit scope

Fresh browser review of the guest-facing experience at `/`, `/explore`, `/u/Mark-Anthony25`, and `/dashboard`, including the program-filter interaction and first keyboard-focus state. The authenticated project workbench was not reachable without a GitHub session.

## User goal and accessibility target

Help an ISU student or alumnus discover projects, understand a student's work, and start a portfolio with minimal friction. Accessibility target: clear hierarchy, keyboard-operable navigation and filters, readable states, and robust recovery when data or authentication is unavailable.

## Captured steps

1. Landing page — healthy visual foundation; primary actions are clear, but the featured-project region is empty.
2. Browse projects — usable search/filter structure; empty state exposes a product-data problem more than a search result.
3. Program filter — native select is discoverable and exposes program choices; selected state is not visually obvious beyond the value text.
4. Public profile — not auditable beyond loading: the route stayed in skeleton state during the capture.
5. Dashboard entry — unauthenticated users are returned to the landing page; there is no route-specific explanation that the dashboard requires sign-in.
6. Keyboard focus — focus reaches the masthead and navigation, but the masthead home button suppresses the default outline and does not provide its own `:focus-visible` treatment.

## Strengths

- The newspaper/workbench visual direction is distinctive and coherent: warm parchment, ink borders, hard-edge shadows, and compact editorial hierarchy.
- The landing page presents a simple value proposition and two understandable next actions: browse or create a portfolio with GitHub.
- Navigation labels are plain and task-oriented: Home, Browse Projects, and Sign In with GitHub.
- Search and program filtering are grouped into one compact control area, and the native select is a good baseline for keyboard and assistive-technology support.
- Empty states use direct language and provide a recovery action (`Clear Filters`).

## UX risks

### P0 — Core discovery looks empty

The landing page says “No student projects published yet,” the directory reports “No students found,” and the public profile remains in loading state. For the primary product promise—discover student work—this reads as either an unlaunched product or a broken data path. Add seeded/demo content for first-run environments and show a bounded error state when loading exceeds a short threshold.

### P1 — Loading can become an indefinite dead end

The public profile showed skeleton placeholders without a visible timeout, error message, retry action, or explanation. Users cannot tell whether the username is wrong, the service is slow, or the profile does not exist. Use three distinct states: loading, not found, and unavailable, with retry/back navigation where appropriate.

### P1 — Dashboard route gives no route-specific recovery

Opening `/dashboard` while signed out silently renders the home experience. This preserves a usable screen, but it breaks user intent and makes deep links feel unreliable. Show a lightweight sign-in gate on the dashboard route with a clear “Sign in with GitHub to open your project desk” action, while keeping browse accessible.

### P1 — Empty-state messaging does not distinguish zero data from zero matches

“No students found” is used for an empty directory and for filtered results. Add the state context: “No students have published profiles yet” versus “No matches for ‘…’ in BS Computer Science.” This improves trust and reduces unnecessary filter clearing.

### P2 — Core discovery actions compete visually

The hero has two high-emphasis buttons with similar weight. Make the main conversion explicit: Browse Projects as the primary action for guests, Create Your Portfolio as the secondary action, and repeat that distinction in the empty featured section.

### P2 — Dense hand-drawn typography risks scanability

The visual style is memorable, but small uppercase labels, tight line-height, and sketch fonts reduce fast scanning—especially in the directory and telemetry areas. Reserve the display font for headings; use a calmer body face for descriptions, filters, helper copy, and error states.

## Accessibility risks

- The masthead home button uses `focus:outline-none` without a replacement focus-visible style. Add a visible outline or ink shadow that meets contrast requirements.
- Modal and mobile-navigation code exposes dialog semantics, but the audit could not verify focus trapping, focus return, Escape behavior, or screen-reader announcement from screenshots alone.
- The profile loading state is visually apparent but should be announced as a status and replaced by a meaningful error/not-found message if it persists.
- The empty-state and filter controls need a live/status relationship so result counts and “no matches” changes are announced without requiring a full reread.
- Contrast, zoom/reflow, reduced-motion behavior, and touch target sizing on mobile require a dedicated viewport and keyboard/AT pass; they were not fully verifiable in this run.

## Opportunity areas

1. Make the first-run experience feel populated with a small set of clearly labeled demo projects or a campus-wide “be the first to publish” CTA.
2. Treat profile resolution as a product flow with not-found, retry, and service-unavailable states.
3. Turn browse into a stronger discovery loop with result counts, recent/featured sorting, and a visible reset state.
4. Add collaboration affordances to the profile/project surface only after the discovery basics are trustworthy.

## Recommended order

1. Fix data/loading states and seed a realistic demo dataset.
2. Add route-aware auth gating for `/dashboard`.
3. Separate empty directory, no-match, not-found, and unavailable copy/states.
4. Fix focus visibility and run a keyboard + screen-reader pass across nav, filters, dialogs, and project cards.
5. Rebalance hero CTA hierarchy and improve body-copy readability.

## Evidence limits

This audit is based on fresh visible browser states and accessibility snapshots. I could not validate the authenticated dashboard, populated cards/project modal behavior, GitHub OAuth completion, mobile reflow, color contrast with tooling, focus trapping, or screen-reader announcements without a seeded session and a dedicated accessibility test pass.
