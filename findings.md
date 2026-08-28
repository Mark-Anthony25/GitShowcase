# Findings: Mobile UI Audit (~375-390px Viewport & 320px Narrow Devices)

## 1. Issue 1: Duplicate CTA Overlay Bug (Nav Drawer vs Hero)
- **Current State**: Mobile menu in `src/components/Header.tsx` renders inline inside the `<header>` container as a collapsible box (`bg-[#FAF6EC]`). Because it does not backdrop-dim or hide the underlying hero section, when the drawer expands on a mobile viewport (~375-390px), the drawer's "Browse Projects" and "Guest Demo" appear directly stacked over the hero's "Browse Projects" and "Try Guest Demo" buttons.
- **Fix**: Transform the mobile drawer into a true modal/drawer overlay with an inked dimmed backdrop (`fixed inset-0 bg-[#212121]/60 z-50 backdrop-blur-xs`), body scroll lock when open, and clean tactile paper modal layout that completely isolates the navigation from the underlying hero page content.

## 2. Issue 2: One Primary CTA per Screen
- **Current State**: "Home" (when active in nav), "GitHub Sign In" (in nav/drawer), and "Browse Projects" (in hero) all share solid black fill (`bg-[#212121] text-[#FEFCF6]` / `paper-button-dark`), creating visual noise and diluting action hierarchy.
- **Fix**: Reserve solid black fill (`paper-button-dark`) exclusively for the single primary landing action: "Browse Projects". Demote "Home" active nav indicator to an inked bottom border / warm tint (`bg-[#FAF6EC] font-black border-b-2`), and demote "GitHub Sign In" in header to the tactile standard outline button (`paper-button` parchment fill with `1.5px` ink border).

## 3. Issue 3: Icon Set Unification
- **Current State**: Mixed icon styles (filled stars, solid background inverted Octocat in logo, varying outline weights across steps).
- **Fix**: Standardize on Lucide line icons with consistent 2px stroke width, un-filled paths, and inked `#212121` stroke across Logo, Sign-in, and Steps 01/02/03.

## 4. Issue 4: Surface Real Content Sooner
- **Current State**: Visitors on mobile must scroll through Header -> Hero -> How It Works (3 cards) before reaching any student repository.
- **Fix**: Insert a compact, tactile "Latest Student Dispatches" preview strip directly below the Hero action buttons (before "How It Works") displaying 2-3 real student projects with author badges, tags, and repo links.

## 5. Issue 5: Layout at 320px Width (iPhone SE)
- **Current State**: Cards with `2.5px 2.5px 0px` hard drop-shadows combined with nested padding (`p-3.5` + sheet padding) risk right-edge clipping or horizontal scroll on 320px screens.
- **Fix**: Apply explicit `box-sizing: border-box`, `max-w-full`, responsive card padding (`p-2.5` on `<=360px`, `p-3.5` on `>=375px`), and shadow margin clearance (`overflow-x-clip` on parent containers).

## 6. Issue 6: Body Text Weight on Mobile
- **Current State**: `font-serif-body` (`Patrick Hand`) at regular weight (400) and `text-xs` (12px) in `text-stone-700` is thin and hard to read on mobile screens.
- **Fix**: Bump body text font weight to `font-medium` (500) and color to high-contrast `text-[#212121]` or `text-stone-900`, increasing legibility on mobile viewports.
