# Progress Log

## Session 2026-08-28
- Analyzed GitHub OAuth 404 'This is not the web page you are looking for'.
- Identified root cause of GitHub 404: Invalid/unmatched GitHub OAuth App Client ID inside Supabase Auth Provider settings.
- Identified root cause of Vercel Demo mode fallback: Static build assets on Vercel were built before environment variables were defined or without cache clearance.
- Prepared actionable diagnosis and verification steps.
