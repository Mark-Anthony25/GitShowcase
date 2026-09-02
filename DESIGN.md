---
name: GitShowcase
description: Hand-drawn PaperCSS project showcase and collaboration platform for Isabela State University students and alumni.
colors:
  primary: "#212121"
  primary-surface: "#FEFCF6"
  secondary-surface: "#FAF6EC"
  canvas-bg: "#F7F3E9"
  paper-sheet: "#FEFCF6"
  paper-border: "#212121"
  paper-badge: "#EFE9DB"
  accent-pinned: "#FDE68A"
  accent-pinned-text: "#451A03"
  accent-pinned-border: "#92400E"
  accent-flame-bg: "#FEF3C7"
  accent-flame-text: "#78350F"
  accent-flame-border: "#FBBF24"
  activity-level-0: "#EAE5D9"
  activity-level-1: "#9BE9A8"
  activity-level-2: "#40C463"
  activity-level-3: "#30A14E"
  activity-level-4: "#216E39"
  ink-main: "#212121"
  ink-muted: "#4B5563"
  ink-subtle: "#57534E"
  btn-primary-bg: "#0071DE"
  btn-success-bg: "#86E08C"
  btn-warning-bg: "#FFC93C"
  btn-dark-bg: "#212121"
typography:
  display:
    fontFamily: "'Neucha', 'Oswald', cursive, sans-serif"
    fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Neucha', 'Oswald', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.02em"
  title:
    fontFamily: "'Neucha', 'Oswald', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Patrick Hand', 'Newsreader', Georgia, serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "'Space Mono', 'Courier New', monospace"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  paper-organic: "255px 15px 225px 15px/15px 225px 15px 255px"
  xs: "2px"
  sm: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-surface}"
    rounded: "{rounded.paper-organic}"
    padding: "6px 14px"
    minHeight: "34px"
  button-secondary:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.paper-organic}"
    padding: "6px 14px"
    minHeight: "34px"
  badge:
    backgroundColor: "{colors.paper-badge}"
    textColor: "{colors.primary}"
    rounded: "{rounded.paper-organic}"
    padding: "1px 6px"
  card:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.paper-organic}"
    padding: "14px to 16px"
  input:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.paper-organic}"
    padding: "6px 10px"
    minHeight: "34px"
---

# Design System: GitShowcase

## Overview

**Creative North Star: "The Campus Gazette & Developer Workbench"**

GitShowcase fuses an authentic editorial broadsheet newspaper with an engineer's tactile workbench. Built specifically for Isabela State University - Cauayan Campus computing students, the visual language departs sharply from generic flat SaaS cards and sterile dark-mode consoles. It treats repositories, capstones, and commit activity as published dispatches in an academic gazette.

Every container, button, badge, and input feels hand-drafted on warm parchment sheets with dark inked outlines, asymmetric organic radii, and crisp drop-shadow offsets that evoke ink stamped onto newsprint. 

**Key Characteristics:**
- **Tactile Parchment Foundation:** Warm newsprint backgrounds (`#F7F3E9`) layered over crisp paper sheets (`#FEFCF6`) and card stock (`#FAF6EC`).
- **Organic Hand-Drawn Outlines:** Authentic PaperCSS bounding curves (`255px 15px 225px 15px/15px 225px 15px 255px`) with inked 1.5px solid `#212121` strokes.
- **Editorial Broadside Hierarchy:** Bold condensed newsprint headings paired with comfortable compact body notes and monospace telemetry data.
- **Calibrated Density & Proportions:** Crisp, non-bloated component dimensions that maximize screen real estate and avoid oversized bulky layouts.
- **Mechanical Drop Shadows:** Zero blurred gaussian drop-shadows; all depth is rendered through hard-edged inked offsets (`2.5px 2.5px 0px #212121` / `4px 4px 0px #000`).

## Colors

The palette is rooted in warm parchment paper stocks, deep carbon ink, and deliberate signal accents for activity and repository highlights.

### Primary
- **Carbon Ink** (`#212121`): The primary structural stroke, typography color, masthead branding, and high-emphasis button fills.
- **Parchment Sheet** (`#FEFCF6`): The primary surface container for main sheets, cards, and reading surfaces.

### Secondary
- **Aged Newsprint** (`#FAF6EC`): Used for sub-panels, secondary containers, and featured repository backgrounds.
- **Desk Canvas** (`#F7F3E9`): The outermost page background setting off the central paper sheet.
- **Parchment Pill Badge** (`#EFE9DB`): Neutral badge fill for tags, roles, and status indicators.

### Tertiary & Signal Accents
- **Lead Dispatch Amber** (`#FDE68A` / `#92400E`): Reserved exclusively for pinned lead repositories and star highlights.
- **Activity Green Scale** (`#EAE5D9`, `#9BE9A8`, `#40C463`, `#30A14E`, `#216E39`): 5-step commit activity heatmap indicators matching GitHub telemetry.

### Neutral
- **Muted Inked Text** (`#4B5563`): Sub-headlines and secondary labels.
- **Subtle Inked Text** (`#57534E`): Auxiliary timestamps and helper notes.

### Named Rules
**The Inked Boundary Rule.** Every surface, input, button, and badge must have a visible inked border (`1.5px solid #212121`). Borderless floating cards are prohibited.
**The Warm Parchment Rule.** Pure white (`#FFFFFF`) is reserved solely for input box interiors; all background surfaces must use warm parchment (`#FEFCF6`, `#FAF6EC`, `#F7F3E9`).

## Typography

**Display Font:** `Neucha`, `Oswald` (with `cursive`, `sans-serif` fallbacks)  
**Body Font:** `Patrick Hand`, `Newsreader` (with `Georgia`, `serif` fallbacks)  
**Label/Mono Font:** `Space Mono` (with `Courier New`, `monospace` fallbacks)

**Character:** A deliberate synthesis of an editorial newspaper masthead with casual handwritten margins and monospace terminal telemetry.

### Hierarchy
- **Display** (weight 900, `clamp(1.5rem, 3.5vw, 2.25rem)`, line-height 1.15): Hero banner titles, major page headlines, and gazette mastheads.
- **Headline** (weight 700, `1.125rem` / `18px`, line-height 1.25): Section headers, modal titles, and student names.
- **Title** (weight 700, `0.9375rem` / `15px`, line-height 1.3): Project card titles, repository names, and navigation links.
- **Body** (weight 400, `0.8125rem` / `13px`, line-height 1.45): Bio paragraphs, project descriptions, and general copy.
- **Label / Telemetry** (weight 700, `0.6875rem` / `11px`, uppercase, letter-spacing 0.04em): GitHub usernames, star counts, tags, dates, and commit heatmaps.

### Named Rules
**The Editorial Masthead Rule.** All major headings (`h1`, `h2`, `h3`) must use uppercase condensed lettering with negative letter-spacing (`-0.01em` to `0.02em`) to mimic printed headlines.
**The 50-Character Bio Constraint Rule.** Student bio sections must strictly enforce a 50-character limit to preserve punchy newspaper card density.

## Layout

- **Central Paper Container:** Max-width bounded container (`max-w-5xl`) centered on the canvas with balanced padding (`p-2.5` to `p-6`).
- **Tactile Column Grids:** 2-column or 3-column responsive grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with consistent gap rhythm (`gap-3.5` / `14px`).
- **Dashed Newsprint Dividers:** Visual sections are partitioned by dashed ink borders (`border-b border-dashed border-[#212121]`) rather than solid gray hairline dividers.

## Elevation & Depth

GitShowcase eschews soft, blurred shadows in favor of crisp, inked drop shadows that simulate stacked sheets of cut paper.

### Shadow Vocabulary
- **Sheet Elevation** (`box-shadow: 2.5px 2.5px 0px rgba(33, 33, 33, 0.9)` on mobile, `4px 4px 0px` on desktop): Main central paper page wrapper.
- **Card Elevation** (`box-shadow: 2px 2px 0px #212121` on mobile, `2.5px 2.5px 0px` on desktop): Repository cards, student profile headers, and search bars.
- **Button Rest** (`box-shadow: 2px 2px 0px #212121`): Interactive paper buttons.
- **Button Hover** (`box-shadow: 3px 3px 0px #212121`, `transform: translate(-1px, -1px)`): Tactile raised hover state.
- **Button Active / Press** (`box-shadow: 1px 1px 0px #212121`, `transform: translate(1px, 1px)`): Inward mechanical press.

### Named Rules
**The Hard-Edge Shadow Rule.** Never use `blur` radii on box shadows. All shadows must be offset hard-edge blocks (`Xpx Ypx 0px #212121`).

## Components

### Buttons
- **Shape:** Organic paper curve (`255px 15px 225px 15px/15px 225px 15px 255px`).
- **Primary / Dark:** Background `#212121`, text `#FEFCF6`, uppercase `Neucha` bold, padding `0.35rem 0.85rem`, `min-height: 34px`.
- **Secondary / Standard:** Background `#FEFCF6`, text `#212121`, border `1.5px solid #212121`, shadow `2px 2px 0px #212121`.
- **Icon Buttons:** `min-width: 32px; min-height: 32px; padding: 0.35rem;` with `1.5px 1.5px 0px` shadow.

### Cards / Containers
- **Corner Style:** Organic paper curve with `1.5px solid #212121` border.
- **Background:** `#FEFCF6` for standard cards; `#FAF6EC` for featured or secondary highlighted cards.
- **Padding:** Compact `14px` to `16px` (`p-3.5 sm:p-4`).

### Badges & Chips
- **Style:** Compact pill with organic PaperCSS radius, `1.5px solid #212121`, padding `0.08rem 0.45rem`, `font-size: 0.6875rem`.

### Inputs & Fields
- **Style:** Background `#FFFFFF`, border `1.5px solid #212121`, organic paper curve, height `34px - 36px`, padding `0.35rem 0.65rem`.
- **Focus:** Outline none, shadow expansion to `3px 3px 0px #212121`.

### Commit Heatmap Grid
- **Style:** 52-week horizontal calendar with 7-day columns (`12px-14px` rounded `2px` tiles with `3px-3.5px` gaps), integrated 4-metric telemetry matrix, intensity distribution meter, custom tooltip cards, and 5-level green ink fill levels.

## Do's and Don'ts

### Do:
- **Do** wrap every card, modal, and interactive surface with `.paper-card` or `.paper-sheet` and an inked border.
- **Do** use hard-edge drop shadows (`Xpx Ypx 0px #212121`) for all interactive and elevated elements.
- **Do** keep components, buttons, and inputs compact and proportional.
- **Do** format dates and headlines in classic broadsheet style ("WEDNESDAY, 26TH AUGUST 2026", uppercase headings).

### Don't:
- **Don't** use oversized 44px+ minimum heights on desktop card sub-elements (like inline card buttons).
- **Don't** use soft gaussian blurred drop shadows (`shadow-md`, `shadow-xl`) or backdrop glassmorphism.
- **Don't** use cold pure white backgrounds (`#FFFFFF`) for page-level or card backgrounds; stick to warm parchment (`#FEFCF6`, `#FAF6EC`, `#F7F3E9`).
- **Don't** allow long multi-line biographies on student profile cards; keep the 50-character limit intact.

