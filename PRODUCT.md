# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are student developers from Isabela State University - Cauayan Campus (BS Computer Science, BS Information Technology, and related computing/engineering programs) preparing portfolios, sharing capstone projects, and tracking coding consistency. Secondary users include faculty advisers, classmates, and potential tech recruiters evaluating student contributions.

## Product Purpose

GitShowcase provides a centralized portfolio and repository registry for ISU Cauayan Campus student developers. It allows students to link their GitHub accounts, define their academic headline and 50-character bio, curate spotlighted capstone repositories with live stats, and display their 52-week commit activity heatmap on a public profile page.

## Positioning

Unlike generic portfolio builders or raw GitHub profiles, GitShowcase is tailored specifically to the ISU Cauayan computing community, combining academic identity (program, year level) with live GitHub contribution telemetry, repository pinning, and an authentic editorial PaperCSS aesthetic.

## Operating Context

- Used by students during capstone thesis defense preparation, project showcases, and student developer community meetups.
- Accessed on desktop and mobile web browsers across campus networks.
- Connects directly to GitHub OAuth for authentication and Supabase for profile persistence.

## Capabilities and Constraints

- **GitHub Authentication & OAuth:** Seamless sync with GitHub accounts, pulling public repos, stars, forks, languages, and commit activity. Also supports guest demo exploration.
- **Student Profile Management:** Full name, GitHub username, academic program, year level, headline, and a strict 50-character bio.
- **Repository Curation:** Select, reorder, and feature highlight repositories/capstones with live GitHub statistics.
- **Contribution Heatmap:** 52-week commit activity calendar and streak tracking rendered with authentic paper aesthetic.
- **Public & Directory Routes:** Shareable public URL (`/u/:username`), searchable student directory (`/explore`), and student workbench (`/dashboard`).
- **Design Constraint:** Must strictly adhere to the incumbent hand-drawn PaperCSS design system.

## Brand Commitments

- **Name:** GitShowcase • Isabela State University - Cauayan Campus.
- **Aesthetic System:** Hand-drawn / sketchy newspaper editorial motif using PaperCSS (`Neucha`, `Patrick Hand`, warm parchment `#FEFCF6` / `#F7F3E9`, rough border radiuses, dark inked shadows).
- **Tone:** Academic yet student-centric, authentic, tactile, and community-driven.

## Evidence on Hand

- Fully functional React 19 + TypeScript + Tailwind CSS + PaperCSS + Supabase codebase.
- Working GitHub OAuth and demo mock-student auth provider (`src/context/AuthContext.tsx`).
- Live GitHub API integration and commit heatmap parser (`src/lib/github.ts`, `src/components/CommitHeatmap.tsx`).
- Configured routes: Front Page (`/`), Directory (`/explore`), Project Desk (`/dashboard`), and Public Profile (`/u/:username`).

## Product Principles

1. **Student Code First:** Highlight real GitHub commits and open-source project work over static claims.
2. **Tactile Editorial Craft:** Maintain the hand-drawn paper identity across all surfaces without slipping into generic tech-dashboard tropes.
3. **Frictionless Onboarding:** Allow students to get an expressive, populated profile in under 2 minutes using GitHub metadata.
4. **Discoverability:** Make student capstones readily browsable and discoverable by classmates and faculty.
