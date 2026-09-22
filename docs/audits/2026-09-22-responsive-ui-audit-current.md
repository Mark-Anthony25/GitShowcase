# GitShowcase Responsive UI Audit

Date: 2026-09-22  
Target: https://git-showcase-black.vercel.app/u/Mark-Anthony25  
Scope: landing page, browse flow, public profile, mobile navigation, contribution heatmap, project cards, and responsive rules.

## Overall verdict

The mobile experience is coherent and usable: content stacks cleanly, primary actions become full-width, cards do not visibly overlap, and the menu overlay is easy to understand. The highest-impact improvements are to make touch targets larger, reduce the heatmap's visual density, and delay desktop navigation until the layout has enough width.

## Captured steps

1. **Landing page — Good**  
   Mobile hero, CTA buttons, project card, and “How it works” content stack without clipping. The full-width CTAs are easy to tap.

2. **Browse by student — Good with minor density risk**  
   The search field and program selector become full-width and the student card remains readable. The two-mode switch is clear and balanced.

3. **Browse projects only — Good**  
   Switching modes updates the heading, count, and card content without layout instability. The project card preserves a clear details action.

4. **Public profile — Fair**  
   Profile identity, stats, GitHub link, heatmap, and project card are all reachable, but the heatmap becomes too dense on a phone and several controls are smaller than ideal for touch.

5. **Mobile navigation overlay — Good**  
   The modal is visually separated from the page, has an explicit close control, and presents large route buttons. The close icon itself is undersized.

## Findings and recommendations

### P1 — Contribution heatmap is too dense on phones

**Affected size:** 320–639px; strongest at the captured narrow mobile width.  
**Evidence:** month labels visually compress together (“SepOct”), day labels are tiny, and the 52-week grid relies on a horizontal scrollbar. Individual day buttons are much smaller than a comfortable touch target.

**Recommendation:** keep the heatmap horizontally scrollable, but add a visible “Swipe to view 52 weeks” affordance and preserve a fixed left label column. Increase each day’s hit area to at least 24–32px while keeping the colored square smaller inside it. On very narrow screens, consider a compact summary-first layout with the heatmap behind an expandable “View activity grid” control.

### P1 — Icon-only controls are below comfortable mobile target size

**Affected size:** mobile and small tablet.  
**Evidence:** the header menu, modal close, and heatmap refresh controls render around 30–34px; the implementation also defines `.paper-button-icon` at 32px by default.

**Recommendation:** use a 44px minimum hit box for menu, close, refresh, and similar icon-only controls. Keep the icon visually 16–20px so the control does not dominate the screen. Apply the same invisible hit-area approach to heatmap cells.

### P1 — Tablet navigation switches too early

**Affected size:** 768–1023px.  
**Evidence:** the header uses `md:flex` / `md:hidden`, so desktop navigation and auth controls appear from 768px even though the rest of the system only increases type and control sizing at 1024px.

**Recommendation:** keep the compact menu through `lg` (1024px), or introduce a tablet-specific condensed header. At minimum, prevent the signed-in nav from showing all route labels when the available width is below ~960px.

### P2 — Small all-caps typography reduces scanability

**Affected size:** all sizes, most noticeable on mobile.  
**Evidence:** headings, metadata, buttons, and helper copy use compact uppercase hand-drawn typography; several labels in the profile and browse cards are near 10–12px.

**Recommendation:** keep the expressive display face for headings, but use a calmer 14–15px sentence-case body style for descriptions and a minimum 12px for metadata. Reserve uppercase for short labels and buttons. Increase line-height slightly in profile descriptions and filter helper text.

### P2 — Profile action row is tight at narrow widths

**Affected size:** 320–380px.  
**Evidence:** “Back to Browse Projects” and “Share Profile” share one row and both use 34px minimum height. The layout is currently readable, but long labels leave little tolerance for smaller phones or owner-only “Edit Profile” appearing beside them.

**Recommendation:** at `max-width: 380px`, let the action row wrap: keep Back full-width, then place Share/Edit in a second row. Preserve a 44px minimum height for each action.

### P2 — Decorative borders and shadows consume useful phone space

**Affected size:** mobile, especially profile and browse cards.  
**Evidence:** the hand-drawn paper treatment is strong and consistent, but repeated borders, shadows, and generous card framing increase vertical scrolling around already compact content.

**Recommendation:** keep the paper treatment on major containers, but reduce inner card padding and shadow offset by 1–2px below 640px. Avoid stacking a paper sheet, paper card, and another bordered sub-card around the same small content block.

### P2 — Forms need a larger-text verification pass

**Affected size:** mobile and tablet; dashboard/edit flows were not reachable without authentication.  
**Evidence:** live browse search and selector are full-width and usable. Source inspection shows several dashboard/profile inputs at 34–36px height and `text-xs` sizing.

**Recommendation:** use at least 40–44px controls and 16px input text on phones to avoid cramped typing and mobile browser zoom behavior. Stack paired fields below 640px and make modal action buttons full-width when two buttons would become narrow.

## Responsive behavior to preserve

- Full-width mobile CTAs and filters are effective and should remain.
- The student/project cards already collapse to one column on phones.
- The 2×2 profile activity stats are balanced and readable.
- The navigation backdrop correctly prevents page interaction while the menu is open.
- Horizontal scrolling is preferable to clipping the 52-week activity data, but it needs stronger affordance and larger hit areas.

## Evidence limits

The live browser surface available for this audit provided a narrow mobile viewport. I captured and visually inspected the mobile landing, browse, profile, heatmap, and navigation states. Laptop/tablet conclusions are additionally grounded in the app’s responsive source rules (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px), but I could not produce a direct live screenshot at 768px, 1024px, or 1280px in this browser surface. Keyboard-only behavior, screen-reader announcements beyond the exposed accessibility tree, authenticated dashboard screens, and real-device browser chrome were not fully verified.
