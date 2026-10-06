import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.profiles(id uuid primary key);
    grant select on public.profiles to authenticated;
    create table public.showcased_projects(id uuid primary key default gen_random_uuid(),profile_id uuid,repo_full_name text,repo_key text,repo_url text,custom_title text,custom_description text,screenshot_url text);
    create unique index on public.showcased_projects(profile_id,repo_key);
    create function public.save_showcased_project(text,text,text,text) returns public.showcased_projects language sql as $$select null::public.showcased_projects$$;
    create function public.save_showcased_project(text,text,text,text,text) returns public.showcased_projects language sql as $$select null::public.showcased_projects$$;
    insert into public.showcased_projects(repo_full_name) values('legacy/repo');
  `);
  const sql = readFileSync('supabase/migrations/20261006000000_project_links_and_contact.sql', 'utf8');
  await db.exec(sql);
  assert.equal((await db.query('select show_repository_link from public.showcased_projects')).rows[0].show_repository_link, true);
  const user = '11111111-1111-4111-8111-111111111111';
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${user}'`);
  const save = async (extra = '') => (await db.query(`select (public.save_showcased_project('test/one','https://github.com/test/one'${extra})).*`)).rows[0];
  assert.equal((await save()).show_repository_link, false);
  assert.equal((await save()).profile_id, user);
  assert.equal((await save(",null,null,null,true")).show_repository_link, true);
  assert.equal((await save()).show_repository_link, true, 'omitting setting preserves it');
  assert.equal((await save(",null,null,null,false")).show_repository_link, false);
  await db.exec('reset role');
  await db.exec(sql);
  await db.exec('set role authenticated');
  assert.equal((await save()).show_repository_link, false, 'rerunning migration preserves disabled links');
  await db.query('select contact_url from public.profiles limit 0');
  assert.equal((await db.query("select count(*)::int as n from pg_proc where proname='save_showcased_project'")).rows[0].n, 1);
  await db.query("select public.save_showcased_project('test/two','https://github.com/test/two')");
  await db.query("select public.save_showcased_project('test/three','https://github.com/test/three')");
  await assert.rejects(() => db.query("select public.save_showcased_project('test/four','https://github.com/test/four')"), /PROJECT_LIMIT_REACHED/);
  await db.exec("set request.jwt.claim.sub=''");
  await assert.rejects(() => save(), /INVALID_REPOSITORY/);
  await db.exec('reset role; set role anon');
  await assert.rejects(() => save(), /permission denied/);
  console.log('Project links and contact migration passed');
} finally { await db.close(); }
