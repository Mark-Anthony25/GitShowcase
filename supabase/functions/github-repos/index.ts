import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const token = req.headers.get('Authorization') || '';
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user } } = await client.auth.getUser(token.replace(/^Bearer /, ''));
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const username = String(user.user_metadata?.user_name || user.user_metadata?.preferred_username || '').trim();
  if (!username) return new Response(JSON.stringify({ error: 'GitHub username unavailable' }), { status: 400 });
  const result = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, { headers: { Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json' } });
  if (!result.ok) return new Response(JSON.stringify({ error: 'GitHub unavailable' }), { status: result.status, headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  return new Response(await result.text(), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } });
});
