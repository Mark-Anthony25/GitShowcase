# GitShowcase Redesign Specification

## Goal

Simplify GitShowcase for non-technical college students while retaining the existing paper/newspaper visual language, authentication, GitHub integration, data model, and public routes.

## Approved Decisions

- Public profile order is identity, public projects, then an initially collapsed optional GitHub Activity section.
- Project discovery cards use a real, keyboard-accessible `View Project` control; the card and control open the same project detail.
- Student interfaces never expose Supabase, database, OAuth-client, or configuration instructions. Failures use plain retryable language.
- Before GitHub OAuth, explain why GitHub is used, the next setup steps, and that a repository is not public until the student chooses Publish Project.
- Signed-in navigation has Browse Projects, My Projects, and Account. Account contains View Public Profile, Edit Profile, and Sign Out. There is no Settings route.
- Landing uses Browse Projects as the primary CTA and Create Your Portfolio with GitHub as the secondary CTA. Featured Projects replaces Latest Student Dispatches; duplicate Browse All Projects is removed.
- Explore modes are Projects and Students, each with counts, filterable search, empty state, and skeleton loading state.
- Onboarding uses Profile Basics, Choose a Repository, Review Your Project, and Your Project Is Published. The review step owns the definitive Publish Project action. Completion goes to My Projects with public profile as a secondary action.
- My Projects is the private project-management workspace with Published and Repository Candidates tabs, Add Project, Review and Publish, Edit, Unpublish Project, confirmation, and persistent feedback.
- Loading and error states use skeletons and plain language. Preserve existing visual identity, responsive behavior, accessibility behavior, routes, and backend systems.

## Constraints

- Do not add a settings route, a new draft data model, a new visual design system, or backend/auth rewrites.
- Use the smallest safe component-level changes and retain existing routes: `/`, `/explore`, `/dashboard`, `/u/:username`.
- Keep existing paper cards, type, border, button, and responsive patterns.
