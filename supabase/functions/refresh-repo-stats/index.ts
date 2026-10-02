import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const hours = 12;
Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') || '';
  const body = await req.json().catch(() => ({}));
  const repo = String(body.repoFullName || '').trim().toLowerCase();
  if (!auth.startsWith('Bearer ') || !repo.includes('/')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!; const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, service);
  const { data: cached } = await db.from('repo_stats_cache').select('*').eq('repo_full_name', repo).maybeSingle();
  if (cached?.refresh_after && new Date(cached.refresh_after) > new Date()) return Response.json(cached);
  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    const retry = Number(response.headers.get('Retry-After') || 0) || hours * 3600;
    if (cached) { await db.from('repo_stats_cache').update({ refresh_after: new Date(Date.now() + retry * 1000).toISOString() }).eq('repo_full_name', repo); return Response.json(cached); }
    return new Response(JSON.stringify({ error: 'GitHub unavailable' }), { status: response.status });
  }
  const r = await response.json(); const row = { repo_full_name: repo, stars: r.stargazers_count || 0, forks: r.forks_count || 0, language: r.language, topics: r.topics || [], description: r.description, homepage: r.homepage, last_commit_at: r.pushed_at || r.updated_at, fetched_at: new Date().toISOString(), refresh_after: new Date(Date.now() + hours * 3600000).toISOString() };
  const { data, error } = await db.from('repo_stats_cache').upsert(row).select().single();
  return error ? new Response(JSON.stringify({ error: error.message }), { status: 500 }) : Response.json(data);
});
