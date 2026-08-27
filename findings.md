# Findings: GitHub OAuth 404 & Vercel Fallback

## 1. GitHub '404 - This is not the web page you are looking for'
- When the user clicks 'Sign in with GitHub' in the local web app (http://localhost:3002), the app calls:
  supabase.auth.signInWithOAuth({ provider: 'github', options: { ... } })
- Supabase constructs the OAuth redirect URL to https://github.com/login/oauth/authorize?client_id=<CLIENT_ID>&...
- When GitHub receives a request to /login/oauth/authorize with a client_id that is invalid, deleted, from a GitHub App (instead of an OAuth App), or contains trailing/leading spaces, GitHub returns an HTTP 404 HTML page with the exact text:
  **'404: This is not the web page you are looking for.'**
- Therefore, the issue is that the Client ID in Supabase Auth -> Providers -> GitHub is not recognized by GitHub as a valid OAuth App.

## 2. Vercel Demo Mode Fallback
- In src/lib/supabase.ts, isSupabaseConfigured checks import.meta.env.VITE_SUPABASE_URL and import.meta.env.VITE_SUPABASE_ANON_KEY.
- In src/context/AuthContext.tsx:
  If !isSupabaseConfigured, clicking 'Sign in with GitHub' immediately falls back to signInAsDemoStudent() / ctivateDemoSession().
- On Vercel, Vite statically replaces import.meta.env.VITE_* during ite build.
  If environment variables are added in Vercel AFTER the deployment was created, the already-deployed JavaScript file does not have the variables until a **Redeploy with 'Clear Cache and Deploy'** is performed.
