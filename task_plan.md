# Task Plan: Resolve GitHub OAuth 404 & Vercel Demo Mode Fallback

## Goal
Diagnose and resolve:
1. GitHub 404 ('This is not the web page you are looking for') during OAuth authorization on localhost.
2. Vercel falling back to demo mode instead of running live Supabase GitHub OAuth.

## Phases
- [ ] Phase 1: Investigate GitHub OAuth 404 root cause (Client ID / OAuth App type vs GitHub App / Callback URL)
- [ ] Phase 2: Investigate Vercel environment variable injection and build baking
- [ ] Phase 3: Enhance codebase to display exact configuration status & auth errors in UI
- [ ] Phase 4: Verification and step-by-step resolution guide for user

## Errors & Observations
- Error 1: Localhost GitHub Sign in leads to '404 this is not the web page you are looking for' on GitHub. Cause: Incorrect/mismatched GitHub OAuth App Client ID in Supabase or GitHub App instead of OAuth App.
- Error 2: Vercel defaults to Demo Mode. Cause: Vercel build did not have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY defined during build time, so isSupabaseConfigured is false in the bundle.
