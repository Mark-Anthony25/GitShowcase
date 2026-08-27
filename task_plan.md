# Responsive Fix Plan — GitShowcase
Goal: Complete responsive compatibility for mobile and tablet devices while preserving PaperCSS hand-drawn branding.

## Status: COMPLETED
- [x] Phase 1: src/index.css - Fixed .paper-card bg to #FEFCF6 and added :focus-visible ring
- [x] Phase 2: src/components/Header.tsx - Mobile hamburger navigation drawer, dropdown outside-click dismiss, and compact layout
- [x] Phase 3: src/components/CommitHeatmap.tsx - Added mobile swipe indicator hint and fixed tooltip clipping
- [x] Phase 4: src/components/DashboardView.tsx - Expanded touch targets (min 36x36px) for action buttons
- [x] Phase 5: src/components/ExploreView.tsx - Raised badge text sizes from 9px to readable 11px
- [x] Phase 6: src/components/OnboardingModal.tsx - Added max-h-[90dvh] and scroll viewport container
- [x] Phase 7: src/components/SupabaseGuideModal.tsx - Updated to dynamic viewport units (90dvh)

## Verification
- TypeScript type-check: passed (0 errors)
- Production build (vite build): passed (0 errors)
