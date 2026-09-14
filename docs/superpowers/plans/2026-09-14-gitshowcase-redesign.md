# GitShowcase Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved GitShowcase UX redesign without changing its visual identity, authentication, GitHub integration, persistence model, or public route structure.

**Architecture:** Keep the current Vite/React route resolver and existing component ownership. Introduce only narrow reusable primitives where they remove repeated project-detail or loading markup; use the existing `OnboardingModal`, `DashboardView`, `ExploreView`, `PublicProfileView`, and `Header` as the implementation surfaces. Keep student-facing copy independent of Supabase and route account-only management actions through existing app-level state.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Supabase client, existing `tsx` test scripts, Playwright already present as a development dependency.

**Spec:** `docs/superpowers/specs/2026-09-14-gitshowcase-redesign.md`

## Global Constraints

- Preserve existing routes exactly: `/`, `/explore`, `/dashboard`, `/u/:username`.
- Preserve existing GitHub OAuth, GitHub API, Supabase, and local-storage behavior; do not add a Settings route or a draft data model.
- Use the existing paper/newspaper typography, cards, borders, buttons, and responsive conventions.
- Use `Projects`, `Students`, `Featured Projects`, `Create Your Portfolio with GitHub`, `View Project`, `Repository Candidates`, `Review and Publish`, and `Unpublish Project` exactly as approved.
- Student-facing messaging must never mention Supabase, database tables, OAuth client secrets, or configuration.
- Every behavioral change follows red-green-refactor: add a test, run it to observe the relevant failure, make the smallest change, then rerun the test and full checks.

---

## File Structure

- `src/App.tsx`: app-level account/profile editing state, OAuth-explanation state, removal of student-visible guide, onboarding completion destination.
- `src/components/Header.tsx`: canonical public/signed-in navigation and Account menu parity.
- `src/components/LandingView.tsx`: streamlined landing CTAs, featured-project copy, OAuth-explanation trigger.
- `src/components/GitHubConnectModal.tsx`: new narrow pre-OAuth explanation dialog.
- `src/components/ExploreView.tsx`: accessible project/student cards, mode labels/counts, loading/empty states, modal focus behavior.
- `src/components/PublicProfileView.tsx`: project-first public profile and collapsed GitHub activity.
- `src/components/DashboardView.tsx`: canonical private project management labels, feedback, confirmation, and plain-language states.
- `src/components/OnboardingModal.tsx`: approved onboarding copy, publication review, abandon protection, and completion actions.
- `src/components/ProjectSkeleton.tsx`: shared paper-style loading primitives only if they remove duplicated markup.
- `playwright.config.ts`: local Vite configuration for browser regression coverage using the already-installed Playwright dependency.
- `tests/ux-redesign.spec.ts`: visitor-flow browser regression coverage; authenticated OAuth and destructive management actions remain manual acceptance checks because the production auth provider cannot be safely faked without changing application code.

## Task 1: Establish UI regression coverage and shared accessibility utilities

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/ux-redesign.spec.ts`
- Modify: `package.json`
- Modify: `src/components/ExploreView.tsx`

**Interfaces:**
- Produces `ProjectDetailTrigger` behavior: a project trigger must be an actual button with visible `View Project` text and an accessible name.
- Produces test command `npm run test:ux` that runs the React/browser regression suite using the repository’s already-installed dependencies.

- [ ] **Step 1: Write failing test**

```tsx
test('project discovery exposes View Project as an interactive control', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: /view project/i }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ux -- --grep "project discovery exposes"`

Expected: FAIL because the current Explore card exposes `Details` as non-interactive text.

- [ ] **Step 3: Write minimal implementation**

Replace click-only `div`/`span` detail affordances with a button that opens the existing `selectedModalItem` modal. Give it `View Project`, `focus-visible` styling, and a 44px minimum mobile target. Keep the card’s pointer behavior non-conflicting: clicking the card body opens the same modal; nested actions stop propagation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ux -- --grep "project discovery exposes"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json playwright.config.ts tests/ux-redesign.spec.ts src/components/ExploreView.tsx
git commit -m "test: cover accessible project discovery"
```

## Task 2: Implement Phase 1 public-profile and project-detail changes

**Files:**
- Modify: `src/components/PublicProfileView.tsx`
- Modify: `src/components/CommitHeatmap.tsx`
- Modify: `src/components/ExploreView.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Consumes Task 1 project trigger semantics.
- Produces `GitHub Activity` disclosure with `aria-expanded`, project-first DOM order, and a focus-safe project-detail modal.

- [ ] **Step 1: Write failing tests**

```tsx
test('public profile renders Public Projects before collapsed GitHub Activity', async ({ page }) => {
  await page.goto('/u/test-student');
  const content = await page.locator('main').innerText();
  expect(content.indexOf('PUBLIC PROJECTS')).toBeLessThan(content.indexOf('GITHUB ACTIVITY'));
  await expect(page.getByRole('button', { name: /github activity/i })).toHaveAttribute('aria-expanded', 'false');
});

test('project detail closes with Escape and restores focus to its trigger', async ({ page }) => {
  await page.goto('/explore');
  const trigger = page.getByRole('button', { name: /view project/i }).first();
  await trigger.focus();
  await trigger.press('Enter');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:ux -- --grep "public profile renders|project detail closes"`

Expected: FAIL because activity currently precedes projects and dialog Escape/focus-return is not guaranteed.

- [ ] **Step 3: Write minimal implementation**

Reorder `PublicProfileView` sections to identity, public projects, then a native button-controlled GitHub Activity disclosure containing `CommitHeatmap` and metrics. Remove owner project-management calls to action from the public profile body. Add `role="dialog"`, `aria-modal`, Escape close, initial focus, and trigger focus restoration to both existing project-detail modal implementations without changing destination links.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ux -- --grep "public profile renders|project detail closes"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PublicProfileView.tsx src/components/CommitHeatmap.tsx src/components/ExploreView.tsx tests/ux-redesign.spec.ts
git commit -m "feat: prioritize public projects and accessible details"
```

## Task 3: Remove student-facing technical configuration and explain GitHub OAuth

**Files:**
- Create: `src/components/GitHubConnectModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/LandingView.tsx`
- Modify: `src/components/DashboardView.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Produces `onStartGitHubSignIn(): Promise<void>` passed from `AppContent` to Header and LandingView through a `GitHubConnectModal` gate.
- Produces student-safe error copy and removes `SupabaseGuideModal` from normal app rendering.

- [ ] **Step 1: Write failing tests**

```tsx
test('portfolio CTA explains GitHub access and visibility before OAuth', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create your portfolio with github/i }).click();
  await expect(page.getByText(/nothing becomes public until you publish/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /continue to github/i })).toBeVisible();
});

test('student-facing pages do not expose Supabase setup text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/supabase|database tables|client secret/i)).toHaveCount(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:ux -- --grep "portfolio CTA explains|student-facing pages"`

Expected: FAIL because the current CTA starts sign-in directly and existing configuration guidance is rendered by `App.tsx`.

- [ ] **Step 3: Write minimal implementation**

Host `GitHubConnectModal` state in `App.tsx`; pass a request-open handler to Header and LandingView. Its Continue control calls the existing `signInWithGitHub` path. Do not change authentication internals. Remove `SupabaseGuideModal` import/rendering and guide callbacks from student views. Replace catch-path text with `We couldn’t start GitHub sign-in. Try again.` and dashboard infrastructure notices with a project retry message.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ux -- --grep "portfolio CTA explains|student-facing pages"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/GitHubConnectModal.tsx src/components/Header.tsx src/components/LandingView.tsx src/components/DashboardView.tsx tests/ux-redesign.spec.ts
git commit -m "feat: clarify GitHub connection and hide technical setup"
```

## Task 4: Implement Phase 2 navigation, landing, and Explore information architecture

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/LandingView.tsx`
- Modify: `src/components/ExploreView.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Produces Account menu actions `View Public Profile`, `Edit Profile`, and `Sign Out` with desktop/mobile parity.
- Produces Explore modes `Projects (n)` and `Students (n)` and a clear-filters empty state.

- [ ] **Step 1: Write failing tests**

```tsx
test('signed-in navigation exposes profile management only from Account', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation').getByText(/^my profile$/i)).toHaveCount(0);
  await page.getByRole('button', { name: /account/i }).click();
  await expect(page.getByRole('menuitem', { name: /view public profile/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /edit profile/i })).toBeVisible();
});

test('explore labels modes and result counts clearly', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: /^projects \(\d+\)$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^students \(\d+\)$/i })).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:ux -- --grep "signed-in navigation|explore labels"`

Expected: FAIL because My Profile is duplicated and Explore labels/counts differ.

- [ ] **Step 3: Write minimal implementation**

Retain Home/Browse Projects/My Projects as navigation. Replace top-level My Profile with a labelled Account trigger; add View Public Profile, Edit Profile, and Sign Out to both desktop and mobile menus. Keep edit profile in a private modal driven by app-level state, reusing profile-edit form logic rather than adding a route. Update landing copy to Featured Projects and remove the secondary browse CTA. Rename Explore tabs and display filtered result counts; add Clear filters action in no-result states.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ux -- --grep "signed-in navigation|explore labels"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/LandingView.tsx src/components/ExploreView.tsx tests/ux-redesign.spec.ts
git commit -m "feat: simplify navigation and project discovery"
```

## Task 5: Implement Phase 3 deliberate onboarding publication

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/OnboardingModal.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Produces onboarding step labels `Profile Basics`, `Choose a Repository`, `Review Your Project`, and `Your Project Is Published`.
- Produces `onComplete` behavior that sends the user to `/dashboard` and a secondary public-profile button in the success step.

- [ ] **Step 1: Write failing tests**

```tsx
test('landing explains the approved onboarding stages before OAuth', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create your portfolio with github/i }).click();
  await expect(page.getByText(/profile basics/i)).toBeVisible();
  await expect(page.getByText(/choose a repository/i)).toBeVisible();
  await expect(page.getByText(/review your project/i)).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:ux -- --grep "landing explains the approved onboarding"`

Expected: FAIL because the current pre-OAuth UI does not communicate the approved onboarding stages.

- [ ] **Step 3: Write minimal implementation**

Keep the existing four modal steps and repository loading/persistence. Update visible names/copy, mark optional profile fields, keep selection non-publishing, make Review the only publish confirmation, show duplicate as Already Published, and keep submit disabled while saving. Track dirty fields; close/cancel prompts before discarding changes. Change `handleOnboardingComplete` routing to `/dashboard`; success offers Go to My Projects and View Public Profile.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ux -- --grep "landing explains the approved onboarding"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/OnboardingModal.tsx tests/ux-redesign.spec.ts
git commit -m "feat: make onboarding publication deliberate"
```

## Task 6: Implement Phase 4 My Projects as the canonical workspace

**Files:**
- Modify: `src/components/DashboardView.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Produces dashboard tabs `Published (n)` and `Repository Candidates (n)`.
- Produces persistent `Project published`, `Changes saved`, and `Project unpublished` feedback and confirmed `Unpublish Project` removal.

- [ ] **Step 1: Write failing tests**

```tsx
test('public profile never exposes project-management controls', async ({ page }) => {
  await page.goto('/u/mark-anthony25');
  await expect(page.getByRole('button', { name: /unpublish project|review and publish|add project/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ux -- --grep "public profile never exposes"`

Expected: FAIL if owner-management actions remain visible in the public-profile body.

- [ ] **Step 3: Write minimal implementation**

Rename management tabs/copy, preserve existing repository-candidate source and duplicate detection, make Add Project primary, and retain View Public Profile as secondary. Change candidate action to Review and Publish. Replace direct destructive removal with a confirmation dialog. Set feedback state after publication, edit, and unpublish; render it persistently in the dashboard header until the next mutation or dismissal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ux -- --grep "public profile never exposes"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardView.tsx tests/ux-redesign.spec.ts
git commit -m "feat: consolidate private project management"
```

## Task 7: Implement Phase 5 loading, recovery, and responsive accessibility checks

**Files:**
- Create: `src/components/ProjectSkeleton.tsx`
- Modify: `src/components/ExploreView.tsx`
- Modify: `src/components/PublicProfileView.tsx`
- Modify: `src/components/DashboardView.tsx`
- Modify: `tests/ux-redesign.spec.ts`

**Interfaces:**
- Produces reusable `ProjectCardSkeleton` and `ProfileSkeleton` that use the existing paper style.
- Produces plain-language retry states and automated desktop/mobile keyboard smoke coverage.

- [ ] **Step 1: Write failing tests**

```tsx
test('loading project lists render labelled skeletons instead of only text', async ({ page }) => {
  await page.route('**/rest/v1/**', async route => await new Promise(() => {}));
  await page.goto('/explore');
  await expect(page.getByLabel(/loading projects/i)).toBeVisible();
});

test('mobile visitor navigation retains Browse Projects and portfolio creation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /open navigation menu/i }).click();
  await expect(page.getByRole('button', { name: /browse projects/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /create your portfolio with github/i })).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:ux -- --grep "loading project lists|mobile visitor navigation"`

Expected: FAIL because the current loading state is text-only and the mobile portfolio action does not use the approved copy.

- [ ] **Step 3: Write minimal implementation**

Add paper-style skeleton components with accessible loading labels and use them in Explore, public profile, and dashboard list loading states. Replace technical error strings with clear retry actions. Ensure controls used on mobile meet the existing 44px practical target; verify modal Escape, focus return, labelled icon controls, and no page-level horizontal overflow.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ux -- --grep "loading project lists|mobile visitor navigation"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectSkeleton.tsx src/components/ExploreView.tsx src/components/PublicProfileView.tsx src/components/DashboardView.tsx tests/ux-redesign.spec.ts
git commit -m "feat: improve loading and mobile accessibility"
```

## Task 8: Full verification and review

**Files:**
- Modify: only files required by verified review findings.

**Interfaces:**
- Consumes all prior task behavior and the approved specification.

- [ ] **Step 1: Run static and unit verification**

Run: `npm run lint && npm test && npm run test:ux && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Run browser flow verification**

Run: `npm run dev -- --host 127.0.0.1` and execute the UX suite at desktop and 390px mobile widths.

Expected: visitor browse, public profile/project detail, account navigation, dashboard management, and keyboard dialog checks pass.

- [ ] **Step 3: Request code review**

Dispatch a reviewer with the approved spec, this plan, base SHA, final SHA, and the complete diff. Fix all Critical and Important findings, rerun targeted and full verification, then request a scoped rereview.

- [ ] **Step 4: Commit verified review fixes**

```bash
git add <reviewed-files>
git commit -m "fix: address redesign review findings"
```

## Plan Self-Review

### Coverage

- Phase 1 profile ordering, collapsed activity, accessible cards, student-safe technical messaging, and OAuth explanation: Tasks 1-3.
- Phase 2 Account navigation, landing CTA consolidation, terminology, Explore counts/empty state, and management separation: Task 4.
- Phase 3 onboarding sequence, deliberate publication, duplicate prevention, saving/abandon protection, dashboard completion, and public preview: Task 5.
- Phase 4 private project workspace, tabs, labels, confirmation, and persistent feedback: Task 6.
- Phase 5 skeletons, retry states, keyboard/dialog/mobile parity, and horizontal overflow checks: Task 7.
- Build, tests, browser flows, and independent review: Task 8.

### Placeholder Scan

The plan contains no TODO/TBD steps. Browser automation covers the public, safe-to-exercise behaviors; authenticated OAuth and destructive management actions require an authorized test account and are retained as manual acceptance checks rather than faked through production changes.

### Type Consistency

New component boundaries rely on existing React props and route strings. No database types, auth contracts, or route signatures are changed.
