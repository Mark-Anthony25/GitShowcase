# Neutral Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove former-institution branding and make GitShowcase institution-neutral while retaining all existing product behavior.

**Architecture:** Keep backend schema and TypeScript data contracts stable. Replace presentation vocabulary and default choices at the `program` / `year_level` UI boundary, retain legacy stored values, and rewrite fixtures and project collateral to neutral examples.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, PaperCSS, tsx tests.

**Spec:** `docs/superpowers/specs/2026-10-01-neutral-platform-design.md`

## Global Constraints

- No replacement school, campus, university, or organization branding.
- Preserve routes, GitHub OAuth, Supabase schema, stored field names, and public URLs.
- Keep legacy `program` and `year_level` values readable and filterable.
- Do not add dependencies or migrations.

## Review Focus

- Existing profile data using old program values remains visible and selectable as a custom focus area.
- Empty, error, and OAuth states contain no institutional wording.
- Both demo fallback and screenshot fixture data contain no institutional names, usernames, emails, or campus scenarios.
- Generated metadata and public HTML describe a general portfolio platform.
- The institutional-term guard scans all maintained project collateral, not only React source.

---

### Task 1: Neutral profile vocabulary and defaults

**Files:**
- Modify: `src/lib/programs.ts`
- Modify: `src/components/OnboardingModal.tsx`
- Modify: `src/components/ExploreView.tsx`
- Modify: `src/components/PublicProfileView.tsx`
- Modify: `src/lib/showcaseStore.ts`
- Test: `src/lib/__tests__/programs.test.ts`

**Interfaces:**
- Consumes: existing `program` and `year_level` profile fields.
- Produces: neutral focus-area choices, generic experience-stage labels, and backward-compatible matching of legacy values.

- [ ] **Step 1: Write failing focus-area compatibility tests**

```ts
assert.equal(getProgramBadgeLabel(null), 'Focus area not specified');
assert.equal(matchesProgramFilter('BS Computer Science', 'all'), true);
assert.equal(getCanonicalProgram('BS Computer Science').customProgramName, 'BS Computer Science');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `tsx src/lib/__tests__/programs.test.ts`

Expected: FAIL because the neutral default and custom legacy handling do not exist.

- [ ] **Step 3: Implement neutral display behavior**

Replace institution-specific defaults with generic focus areas; retain `program`/`year_level` storage names and treat unknown or legacy values as custom focus areas. Relabel all relevant controls, filters, placeholders, and empty states without changing their event flow.

- [ ] **Step 4: Run focused and existing tests**

Run: `tsx src/lib/__tests__/programs.test.ts && tsx src/lib/__tests__/profileUpdateAndProjects.test.ts && tsx src/components/__tests__/exploreProjectsOnly.test.ts`

Expected: PASS.

### Task 2: Neutral app copy and sample data

**Files:**
- Modify: `src/components/LandingView.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/DashboardView.tsx`
- Modify: `src/components/OnboardingModal.tsx`
- Modify: `src/components/ExploreView.tsx`
- Modify: `src/components/PublicProfileView.tsx`
- Modify: `src/components/SupabaseGuideModal.tsx`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/lib/demoData.ts`
- Modify: `scripts/capture_screenshots.cjs`
- Modify: `docs/audits/2026-09-22-responsive-ui-audit/capture.cjs`
- Test: `src/lib/__tests__/demoData.test.ts`
- Test: `src/components/__tests__/headerMastheadUi.test.ts`

**Interfaces:**
- Consumes: existing copy, demo profile, and showcase-project structures.
- Produces: neutral UI copy and fictional portfolio examples with unchanged object shapes.

- [ ] **Step 1: Extend tests with neutral expectations**

Assert neutral demo usernames/projects and that masthead/onboarding sources do not include former-institution terms.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `tsx src/lib/__tests__/demoData.test.ts && tsx src/components/__tests__/headerMastheadUi.test.ts`

Expected: FAIL because present fixtures and onboarding copy still mention the former institution.

- [ ] **Step 3: Replace app copy and examples**

Use creator, member, profile, portfolio, project, focus area, and experience-stage terms. Replace all institution-specific demo IDs, GitHub names, emails, descriptions, topics, and screenshot fixtures with fictional neutral equivalents.

- [ ] **Step 4: Run affected tests**

Run: `tsx src/lib/__tests__/demoData.test.ts && tsx src/components/__tests__/headerMastheadUi.test.ts && tsx src/components/__tests__/authEntryUi.test.ts && tsx src/components/__tests__/landingLatestDispatchUi.test.ts`

Expected: PASS.

### Task 3: Neutral metadata and maintained project collateral

**Files:**
- Modify: `index.html`
- Modify: `metadata.json`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `task_plan.md`
- Modify: `docs/audits/*.md`
- Modify: `docs/superpowers/specs/*.md`
- Modify: `docs/superpowers/plans/*.md`
- Modify: `supabase/schema.sql`
- Modify: `supabase/migrations/20260101000000_init_student_showcase.sql`
- Test: `src/lib/__tests__/institutionNeutrality.test.ts`

**Interfaces:**
- Consumes: maintained text files and source fixtures.
- Produces: a repository-wide institutional-term regression guard.

- [ ] **Step 1: Write failing institutional-term guard**

Read the listed maintained files plus `src`, `scripts`, and `supabase`; fail when a case-insensitive former-institution identifier appears.

- [ ] **Step 2: Run the guard to verify it fails**

Run: `tsx src/lib/__tests__/institutionNeutrality.test.ts`

Expected: FAIL listing current institutional references.

- [ ] **Step 3: Replace all remaining product collateral references**

Rewrite text and SQL comments as general portfolio-platform material. Preserve historical technical intent while removing school, campus, academic-program, and institution claims.

- [ ] **Step 4: Run the guard and exact search**

Run: `tsx src/lib/__tests__/institutionNeutrality.test.ts` and then run a case-insensitive repository search for each prohibited identifier.

Expected: guard PASS; `rg` exits 1 with no matches.

### Task 4: Full verification

**Files:**
- Modify: test files only if Tasks 1–3 expose required stale expectations.

**Interfaces:**
- Consumes: all completed neutralization changes.
- Produces: evidence the platform still builds and its full check suite remains green.

- [ ] **Step 1: Run project verification**

Run: `npm test && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Review scope against the spec**

Confirm every spec section maps to Tasks 1–4 and re-run the institutional-term guard after any review change.

- [ ] **Step 3: Commit**

```bash
git add src index.html metadata.json README.md PRODUCT.md DESIGN.md findings.md progress.md task_plan.md docs scripts supabase
git commit -m "feat: neutralize portfolio platform branding"
```
