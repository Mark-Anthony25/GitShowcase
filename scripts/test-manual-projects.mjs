import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.profiles(id uuid primary key);
    create table public.showcased_projects(id uuid primary key default gen_random_uuid(),profile_id uuid not null,repo_full_name text not null,repo_key text,repo_url text not null,custom_title text,custom_description text,screenshot_url text,display_order int not null default 0);
    create unique index on public.showcased_projects(profile_id,repo_key);
    insert into public.showcased_projects(profile_id,repo_full_name,repo_key,repo_url) values('11111111-1111-4111-8111-111111111111','creator/legacy','creator/legacy','https://github.com/creator/legacy');
    alter table public.showcased_projects enable row level security;
    create policy owner_write on public.showcased_projects for all to authenticated using(auth.uid()=profile_id) with check(auth.uid()=profile_id);
    grant select,insert,update,delete on public.showcased_projects to authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/20261006000000_project_links_and_contact.sql', 'utf8'));
  const migration = 'supabase/migrations/20261006000002_manual_projects.sql';
  await db.exec(readFileSync(migration, 'utf8'));
  const owner = '11111111-1111-4111-8111-111111111111';
  const id = '22222222-2222-4222-8222-222222222222';
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`);
  const save = async (projectId = id, url = 'https://demo.example/app', title = 'Private work') => (await db.query(`select * from public.save_showcased_project(p_repo_full_name=>null,p_repo_url=>null,p_source=>'manual',p_project_id=>$1,p_deployed_url=>$2,p_custom_title=>$3)`, [projectId, url, title])).rows[0];
  const manual = await save();
  for (const url of ['https://example.com:65535/app', 'http://[::1]:8080', 'http://127.0.0.1:3000', 'https://example.com/path?q=hello%20world']) {
    assert.equal((await db.query('select public.valid_deployed_project_url($1) valid', [url])).rows[0].valid, true);
  }
  assert.equal(manual.id, id);
  assert.equal(manual.source, 'manual');
  assert.equal(manual.repo_full_name, null);
  assert.equal(manual.repo_url, null);
  assert.equal(manual.show_repository_link, false);
  await save();
  assert.equal((await db.query('select count(*)::int n from public.showcased_projects')).rows[0].n, 2, 'retry updates the same manual ID');
  await save('33333333-3333-4333-8333-333333333333');
  await assert.rejects(() => save('44444444-4444-4444-8444-444444444444'), /PROJECT_LIMIT_REACHED/);
  await assert.rejects(() => db.query("insert into public.showcased_projects(profile_id,source,custom_title,deployed_url,show_repository_link) values($1,'manual','Direct insert','https://demo.example',false)", [owner]), /PROJECT_LIMIT_REACHED/);
  for (const url of ['', 'demo.example', 'javascript:alert(1)', 'https://user:password@demo.example', 'https://demo.example/a b', 'https://demo.example:99999', 'http://[::::]']) {
    await assert.rejects(() => save(id, url), /INVALID_DEPLOYED_URL/);
    await assert.rejects(() => db.query('update public.showcased_projects set deployed_url=$1 where id=$2', [url, id]), /INVALID_DEPLOYED_URL/);
  }
  await assert.rejects(() => save(id, 'https://demo.example', ' '), /INVALID_PROJECT_TITLE/);
  await assert.rejects(() => db.query("update public.showcased_projects set show_repository_link=true where id=$1", [id]), /INVALID_MANUAL_REPOSITORY/);
  await assert.rejects(() => db.query("update public.showcased_projects set repo_url='https://github.com/creator/repo' where id=$1", [id]), /INVALID_MANUAL_REPOSITORY/);
  await assert.rejects(() => db.query("update public.showcased_projects set source='github' where id=$1", [id]), /PROJECT_IDENTITY_IMMUTABLE/);
  await db.query("update public.showcased_projects set custom_title='Updated',deployed_url='https://demo.example/new' where id=$1", [id]);
  assert.equal((await db.query('select deployed_url from public.showcased_projects where id=$1', [id])).rows[0].deployed_url, 'https://demo.example/new');
  const legacy = (await db.query("select * from public.showcased_projects where repo_key='creator/legacy'")).rows[0];
  assert.equal(legacy.source, 'github');
  assert.equal(legacy.show_repository_link, true);
  await db.query("select public.save_showcased_project('CREATOR/LEGACY','https://github.com/creator/legacy')");
  assert.equal((await db.query('select count(*)::int n from public.showcased_projects')).rows[0].n, 3);
  await db.exec("set request.jwt.claim.sub='99999999-9999-4999-8999-999999999999'");
  await assert.rejects(() => save(), /PROJECT_OWNER_MISMATCH/);
  assert.equal((await db.query("update public.showcased_projects set custom_title='Intruder' where id=$1 returning id", [id])).rows.length, 0);
  await db.exec("set request.jwt.claim.sub=''");
  await assert.rejects(() => save(), /AUTHENTICATION_REQUIRED/);
  await db.exec('reset role; set role anon');
  await assert.rejects(() => save(), /permission denied/);
  await db.exec('reset role');
  await db.exec(readFileSync(migration, 'utf8'));
  assert.equal((await db.query("select count(*)::int n from public.showcased_projects where source='manual'")).rows[0].n, 2);
  assert.equal((await db.query("select count(*)::int n from pg_proc where proname='save_showcased_project'")).rows[0].n, 1);

  // Exercise the SQL Editor setup itself; fixtures must not supply its missing indexes.
  const fresh = new PGlite();
  try {
    await fresh.exec(`
      create role authenticated; create role anon; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select current_user::text$$;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    `);
    const schema = readFileSync('supabase/schema.sql', 'utf8');
    await fresh.exec(schema);
    await fresh.query('insert into auth.users(id,email) values($1,$2)', [owner, 'creator@example.com']);
    await fresh.exec(`set request.jwt.claim.sub='${owner}'`);
    await fresh.query("select public.save_showcased_project(null,null,'Fresh project',null,null,false,'manual','https://demo.example',$1)", [id]);
    await fresh.query("select public.save_showcased_project(null,null,'Fresh project',null,null,false,'manual','https://demo.example',$1)", ['33333333-3333-4333-8333-333333333333']);
    await fresh.exec(schema);
    assert.equal((await fresh.query("select count(*)::int n from public.showcased_projects where source='manual'")).rows[0].n, 2, 'rerunning fresh schema preserves all manual projects');
  } finally { await fresh.close(); }
  console.log('Manual project database checks passed');
} finally { await db.close(); }
