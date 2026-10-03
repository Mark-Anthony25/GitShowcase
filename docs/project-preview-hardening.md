# Project preview hardening

Apply `supabase/migrations/20261003000000_project_cover_limits.sql` followed by `supabase/migrations/20261003000001_fix_cover_upload_preflight.sql` (or the updated schema for a fresh installation), deploy the updated `delete-account` Edge Function, then deploy the frontend. No remote migration or deployment was executed by this change. Verify storage policies on a staging Supabase project before production; automated browser tests do not exercise live RLS.

## Behavior and limits

- JPEG, PNG and still WebP only. MIME must match the signature; GIF, SVG, HEIC/HEIF, AVIF, animated PNG/WebP and mislabeled files fail with explicit errors.
- Inputs: 10 MiB, minimum 64px per side, maximum 32 megapixels. Resize the longest edge to 1280px with EXIF-aware `createImageBitmap`. The decode requests the smaller dimensions rather than allocating a full-size canvas; internal decoder allocations still depend on the browser.
- Worker with OffscreenCanvas, main-thread fallback, WebP qualities 0.8/0.7/0.6 and JPEG fallback. Hard upload cap: 200 KiB. An original is used only if it already meets size/dimension limits and is smaller than the encoded result; never keep a second original copy.
- Logs contain code, failed step, MIME, bytes, known dimensions and underlying exception. No file bytes, access tokens or data URLs are logged.
- Immediate local preview after input/header validation; previews are revoked on change/close/unmount, stale selections cannot overwrite new ones. Upload progress is real XHR byte progress, capped at 99% until storage confirms success. Upload failure keeps the prepared blob and permits retry. Invalid selection clears the pending image and permits another selection or GitHub fallback.
- One `user_id/project_id/cover` object, overwritten on replacement. Its extensionless path allows PNG originals and JPEG fallback without mislabeled extensions or additional objects. Public URLs carry a SHA-256 `?v=` content version. Request a one-year immutable cache header; confirm the actual response header on your Supabase deployment (the hosted service controls it). This deliberately uses versioned URLs rather than accumulating versioned filenames. Use only the versioned URL when rendering. The bare mutable object URL must not be considered immutable.
- Create the owned project before uploading. If upload fails, the project remains published with GitHub social preview; retry updates the same repository/project. If storing the URL fails after upload, the deterministic cover is still attached to an owned project and is removed on project deletion.
- Clean legacy timestamp images before replacement and stored images before row/account deletion. A database guard rejects direct/cascade project deletion while its current cover exists. Never delete storage metadata with SQL: use Storage API. Existing unreferenced legacy objects need a one-time audit/removal through the Storage dashboard/API; this migration does not destroy historical files.
- The bucket enforces actual 200 KiB and allowed MIME types; RLS validates supplied MIME/size metadata (including preflight `contentLength`) and permits metadata-free preflight checks; RLS permits only the caller's existing project cover. A trigger enforces three projects per account, including direct table writes. Service-role clients bypass RLS and must follow the same rules. Cross-user bucket reads remain public, by design.
- Sandbox stores only the prepared thumbnail as a data URL. Quota/read failures are caught; failed local persistence shows an error rather than reporting success. Base64 adds roughly 33% overhead, so browser storage remains suitable for a few demo projects, not a 1000-user database.
- GitHub OpenGraph/social previews are fetched live from GitHub and are never copied into storage. No Supabase transformations or Vercel image optimization are requested.

## Verification

`npm test`, `npm run lint`, `npm run build`. The test suite now executes the migration policies in isolated PostgreSQL via the dev-only PGlite dependency.

For actual browser processing, start `npm run dev`, then run `npm run test:images:browser`. Also run `node scripts/test-project-preview-ui.mjs` for the actual dashboard with a simulated auth/storage backend, including upload failure/retry, replacement, and deletion. Set `IMAGE_TEST_URL` if the dev server uses another port. Chromium tests cover a real 12MP JPEG, portrait aspect ratio, EXIF orientation 6 dimensions and pixel placement, worker and main-thread paths, unsupported formats, 20 MiB input, tiny PNG, wrong MIME, original-size preference, JPEG fallback, null encoding, quality retries and final-size rejection.

Manual checks on Chrome, Firefox and iOS Safari:

| Input/action | Expected |
| --- | --- |
| HEIC/HEIF or AVIF | Unsupported format; JPG/PNG/WebP guidance; form remains usable |
| 20MB phone photo | Reject before decode, max 10MB message |
| Rotated phone JPEG | Upright preview, preserved proportions, longest edge <=1280px |
| 16x16 PNG | Minimum 64px per side message; 64x64 PNG succeeds |
| TXT renamed `.png` | Invalid image / wrong MIME rejection |
| Animated GIF/SVG/APNG/WebP | Still-image guidance, no upload |
| Switch files quickly or close/reopen | Latest selection wins; no lingering blob preview |
| Disable worker support | Main-thread compression succeeds |
| Disconnect network / expire login | Upload error, preserved thumbnail, retry after reconnect |
| Fill localStorage | Quota error; clear thumbnail and use GitHub preview to recover |
| Replace and delete project | One cover object after replace; no cover after deletion |
| Delete account | Preview cleanup finishes before auth user deletion |

Staging Storage/API checks: reject >204800 bytes, disallowed MIME, another user's folder, unknown project ID, extra filename, fourth project, and deletes before object cleanup. Accept owned cover upsert and re-save of an existing repo at the three-project limit. Verify no `/render/image/` or Vercel `/_next/image` requests.

## Capacity at 1000 users

At three projects and one 200 KiB cover each: 3000 objects, 614.4 MB (about 586 MiB), leaving roughly 385 MB of a decimal 1 GB quota for avatars and other files. Three images per project would be 1.84 GB and exceed the free storage allowance; this implementation allows one.

At 200 KiB per cold image request, 5 GB is roughly 24,400 image downloads per month. A page displaying 12 covers uses up to 2.46 MB; about 2000 cold page views can consume 5 GB. Browser caching and GitHub fallback reduce this, but 1000 users alone cannot guarantee free-tier bandwidth. Monitor cached and uncached egress separately, plus API/database/auth/function usage and existing avatars/legacy files. A 5MB avatar for every user alone would exceed 1GB.

Current published limits: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [storage egress quotas](https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing). Supabase Free includes 1GB storage, 5GB uncached egress and 5GB cached egress. [Vercel Hobby](https://vercel.com/docs/limits/fair-use-guidelines) is for personal non-commercial use and includes up to 100GB transfer. Preview files go directly to Supabase/GitHub; frontend assets and other API traffic still count toward their respective providers' allowances. This is a capacity estimate, not a 1000-user load test.

## Changed files

| File | Change |
| --- | --- |
| `src/lib/imageProcessing.ts` | Typed errors/results, header validation, dimension/animation checks, EXIF-aware bounded resize and encoding |
| `src/lib/imageCompression.worker.ts` | OffscreenCanvas worker and structured error transport |
| `src/lib/imageCompression.ts` | Worker fallback, diagnostics, direct progress upload, versioned URL and object cleanup |
| `src/components/DashboardView.tsx` | Recoverable add/edit errors, immediate preview, URL cleanup, selection races, progress/retry, optional GitHub fallback |
| `src/lib/showcaseStore.ts` | Delete previews before projects, surface persistence failures, catch browser-storage reads |
| `src/lib/storage.ts` | Remove Supabase image transformation requests |
| `src/components/ExploreView.tsx` | Fixed dimensions for project preview images |
| `src/components/PublicProfileView.tsx` | Fixed dimensions for project preview images |
| `src/components/LandingView.tsx` | Fixed dimensions for project preview images |
| `src/context/AuthContext.tsx` | Clean previews before account-deletion RPC fallback |
| `supabase/functions/delete-account/index.ts` | Remove the caller's stored previews before deleting auth user |
| `supabase/migrations/20261003000000_project_cover_limits.sql` | Bucket MIME/size limits, owned-cover RLS, deletion guard and project cap |
| `supabase/schema.sql` | Same rules for fresh setup |
| `src/lib/__tests__/imageCompression.test.ts` | Regressions for unsupported, oversized and mislabeled inputs |
| `src/components/__tests__/screenshotAnd3ColumnGrid.test.ts` | Update upload requirement assertions for optional previews |
| `scripts/test-image-browser.mjs` | Real-browser decode/worker/orientation checks and encoder failure tests |
| `docs/project-preview-hardening.md` | Deployment, manual checklist, file inventory and capacity estimates |

## Validation follow-up (2026-10-03)

The previous browser compression checks passed, but the original RLS predicate was incorrect: it required `metadata.size` during upload preflight. Supabase Storage preflight supplies `metadata.contentLength` (or omits metadata on some paths), so a legitimate 2 KiB upload was denied with SQLSTATE 42501. The forward migration repairs that predicate for existing installations. The bucket remains the authoritative byte/MIME enforcement layer; RLS checks the metadata fields that are available during preflight. [Supabase Storage uploader source](https://github.com/supabase/storage/blob/master/src/storage/uploader.ts).

The new policy regression test was observed failing before the repair, then passing after it. It covers metadata shapes, real authenticated INSERT/upsert under RLS, cross-user/path restrictions, oversized/disallowed metadata, cleanup-before-delete, and the project cap. This uses PostgreSQL with a minimal Supabase-compatible schema, not a hosted Storage server; staging/production upload remains unverified.

The dashboard browser harness uses the real component, image utility and store with deterministic auth/backend fixtures. It verifies invalid-file recovery, retained thumbnail after a 403 upload failure, retry to the same project, the content-versioned URL, replacement at the same path and storage cleanup before row deletion. Sandbox checks also verified compressed data URL persistence and absence of JavaScript page errors.

The sandbox harness additionally forces QuotaExceededError, confirms previous persisted data is intact, retries after restoring browser storage, and verifies image preview URLs are revoked after modal completion. Browser tests now assert that the worker sends a successful response and also force the worker-disabled fallback.

Additional changed files: `supabase/migrations/20261003000001_fix_cover_upload_preflight.sql`, `scripts/test-project-cover-policies.mjs`, `scripts/test-project-preview-ui.mjs`, `scripts/test-project-preview-sandbox.mjs`, `scripts/test-image-browser.mjs`, `package.json` and `package-lock.json` (dev-only PostgreSQL test dependency and test command).
