# Progress Log

## Session 2026-08-28
- Analyzed OAuth failure: Unable to exchange external code
- Cause: Supabase backend could not complete token exchange with GitHub's https://github.com/login/oauth/access_token due to mismatched, expired, or invalid GitHub Client Secret in Supabase.
- Updated codebase:
  1.  ite.config.ts: Added envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'] so environment variable names work with or without VITE_.
  2. src/lib/supabase.ts & src/vite-env.d.ts: Supported SUPABASE_URL and SUPABASE_ANON_KEY aliases.
  3. src/context/AuthContext.tsx: Added URL OAuth error parser and surfaced user-friendly error messages.
  4. src/components/LandingView.tsx: Added an alert banner for OAuth token exchange notifications.

## Mobile UI Audit & Fixes Session
- [x] **Fix 1 Completed**: Fix duplicate CTA overlay bug
  - Transformed mobile menu into a true modal dialog with an inked dark backdrop (`fixed inset-0 bg-[#212121]/70 backdrop-blur-xs z-50`).
  - Added full background scroll locking (`document.body.style.overflow = 'hidden'`) and `Escape` key listener.
  - Wrapped menu content in a floating hand-crafted `.paper-card` with an explicit close button and click-outside dismissal.
  - Eliminated duplicate CTA stacking over the hero section.
  - Verified clean production build with Vite.
- [x] **Fix 2 Completed**: Establish one primary CTA per screen
  - Reserved solid black fill (`paper-button-dark`) exclusively for the single primary landing action: **"Browse Projects"** in the Hero.
  - Demoted active navigation buttons from solid black fill to tactile newsprint style (`bg-[#FAF6EC] border-b-[3px] border-b-[#212121] text-[#212121]`).
  - Demoted desktop and mobile "GitHub Sign In" buttons to standard tactile outline `paper-button` (`bg-[#FEFCF6] text-[#212121] border-1.5 border-[#212121] hover:bg-[#FAF6EC]`).
  - Preserved secondary style on "Guest Demo" so visual weight is unmistakably tiered.
- [x] **Fix 3 Completed**: Unify icon set
  - Standardized all icons to Lucide un-filled pen-and-ink line art with uniform `stroke-[2]` (2px) and `#212121` stroke color.
  - Replaced inverted solid logo box with a tactile paper badge (`bg-[#FEFCF6]` with inked outline).
  - Standardized Step 1 (`Github`), Step 2 (`User`), and Step 3 (`FolderGit2`) into matching boxed inked badges (`bg-[#FAF6EC] border-1.5 border-[#212121] shadow-[1px_1px_0px_#212121]`).
  - Removed filled variant on Star icons across section headings.
- [x] **Fix 4 Completed**: Surface real student project content sooner
  - Added a "Latest Student Dispatches" preview strip directly beneath the Hero action buttons and before "How It Works".
  - Renders 3 real student projects with category pills, live repository star counts, titles, descriptions, student author links, and direct GitHub repo links.
  - Initialized with zero-layout-shift fallback data and dynamically hydrates from `getAllStudentsShowcase()`.
- [x] **Fix 5 Completed**: Test layout at 320px width
  - Added `@media (max-width: 360px)` calibration in `index.css` reducing sheet and card drop shadows from 2.5px to 1.5px hard offsets.
  - Adjusted root page padding in `App.tsx` (`p-1.5 xs:p-2 sm:p-4`) and central paper-sheet padding (`px-2.5 sm:px-6`).
  - Calibrated Step 01/02/03 cards and Featured Project cards padding to `p-3 sm:p-4` with `min-w-0 break-words` to eliminate any horizontal overflow or shadow bleed on iPhone SE (320px).
- [x] **Fix 6 Completed**: Increase body text weight on mobile
  - Elevated `.font-serif-body` base weight to 500 (`font-medium`) and added `@media (max-width: 639px)` rules applying `font-weight: 600` and `font-size: 0.84375rem (~13.5px)` with high-contrast carbon ink `#212121`.
  - Updated Hero description, Dispatches preview text, Step card notes, and Featured Project descriptions to `font-semibold sm:font-medium text-[#212121]` for sharp, high-legibility mobile reading.
  - Verified clean production build with Vite.
