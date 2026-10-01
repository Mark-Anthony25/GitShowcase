# Neutral Portfolio Platform Design

## Goal

Reposition GitShowcase as a general-purpose student portfolio and project showcase that works for any school, organization, or individual, without changing its core GitHub, profile, project, routing, or persistence behavior.

## Scope

- Remove or replace every former-institution reference from shipped UI, metadata, seed/demo data, repository documentation, screenshots scripts, and tests.
- Keep GitShowcase as the product name; no replacement institution is introduced.
- Keep GitHub OAuth, Supabase tables and stored field names, public profile URLs, project selection, live GitHub statistics, and PaperCSS visuals unchanged.
- Change academic-only user-facing concepts to optional, institution-neutral profile concepts: `Degree Program` becomes `Focus Area`; `Academic Level` becomes `Experience Stage`; student-specific nouns become creator/profile/project wording where displayed.

## Product Copy and Data

- Landing, explore, dashboard, header, onboarding, profile, setup, and error/empty states address people as creators or members and work as projects or portfolios.
- New focus-area choices are broadly useful (for example Software Development, Design, Research, and Other). Existing stored values continue to render and filter so current records are not migrated or lost.
- Demo people, usernames, repositories, descriptions, and email addresses use fictional neutral identities and no campus, school, or academic-program branding.
- HTML metadata, `metadata.json`, README, product/design documents, task notes, audit fixtures, and capture scripts describe the neutral platform or neutral examples only.

## Compatibility and Error Handling

- The database `program` and `year_level` columns, existing TypeScript field names, and store API names remain intact to avoid a schema migration and preserve existing user data.
- Legacy program values remain readable; unknown values are treated as custom focus areas rather than rejected.
- Authentication and GitHub configuration messages keep their current behavior, with institution-neutral text.

## Verification

- Add a focused text-regression check that fails on institutional terms in shipped source, metadata, demo data, and maintained documentation/scripts.
- Update existing UI/data checks for neutral labels and data.
- Run the full test suite, TypeScript check, production build, and an exact repository search for prohibited institutional strings.
