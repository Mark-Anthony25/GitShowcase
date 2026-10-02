-- ==============================================================================
-- GitShowcase Production Schema Repair & Upgrades
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure all columns exist on public.profiles
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists is_onboarded boolean default false;
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists year_level text;
alter table public.profiles add column if not exists website_url text;

-- 2. Ensure all columns exist on public.showcased_projects
alter table public.showcased_projects add column if not exists repo_key text;
update public.showcased_projects set repo_key = lower(trim(repo_full_name)) where repo_key is null;

-- 3. Ensure all columns exist on public.repo_stats_cache
alter table public.repo_stats_cache add column if not exists description text;
alter table public.repo_stats_cache add column if not exists homepage text;
alter table public.repo_stats_cache add column if not exists refresh_after timestamptz default now();

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.showcased_projects enable row level security;
alter table public.repo_stats_cache enable row level security;

-- 5. Production RLS Policies (Discrete, secure, idempotent)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile" on public.profiles for delete using ((select auth.uid()) = id);

drop policy if exists "Showcased projects are viewable by everyone" on public.showcased_projects;
create policy "Showcased projects are viewable by everyone" on public.showcased_projects for select using (true);

drop policy if exists "Users can insert their own showcased projects" on public.showcased_projects;
create policy "Users can insert their own showcased projects" on public.showcased_projects for insert with check ((select auth.uid()) = profile_id);

drop policy if exists "Users can update their own showcased projects" on public.showcased_projects;
create policy "Users can update their own showcased projects" on public.showcased_projects for update using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

drop policy if exists "Users can delete their own showcased projects" on public.showcased_projects;
create policy "Users can delete their own showcased projects" on public.showcased_projects for delete using ((select auth.uid()) = profile_id);

drop policy if exists "Repo stats cache is viewable by everyone" on public.repo_stats_cache;
create policy "Repo stats cache is viewable by everyone" on public.repo_stats_cache for select using (true);

drop policy if exists "Authenticated users can update repo cache" on public.repo_stats_cache;
create policy "Authenticated users can update repo cache" on public.repo_stats_cache for all using ((select auth.role()) = 'authenticated');

-- 6. High-Performance Database Indexes
create index if not exists idx_showcased_projects_profile_id on public.showcased_projects(profile_id);
create index if not exists idx_showcased_projects_display_order on public.showcased_projects(display_order asc, added_at desc);
create index if not exists idx_profiles_program on public.profiles(program);
create index if not exists idx_profiles_created_at on public.profiles(created_at desc);
create index if not exists idx_profiles_username_lower on public.profiles(lower(github_username));
create unique index if not exists showcased_projects_profile_repo_key_idx on public.showcased_projects (profile_id, repo_key);

-- 7. Account Deletion RPC function (deletes caller from auth.users, cascades to profiles and projects)
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

-- 8. Atomic Project Save RPC function (enforces 3-project limit and upserts by canonical key)
create or replace function public.save_showcased_project(
  p_repo_full_name text,
  p_repo_url text,
  p_custom_title text default null,
  p_custom_description text default null
) returns public.showcased_projects
language plpgsql security definer set search_path = public as $$
declare
  saved public.showcased_projects;
  canonical_key text := lower(trim(p_repo_full_name));
begin
  if auth.uid() is null or canonical_key = '' or position('/' in canonical_key) = 0 then
    raise exception 'INVALID_REPOSITORY';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if not exists (select 1 from public.showcased_projects sp where sp.profile_id = auth.uid() and sp.repo_key = canonical_key)
     and (select count(*) from public.showcased_projects where profile_id = auth.uid()) >= 3 then
    raise exception 'PROJECT_LIMIT_REACHED';
  end if;
  insert into public.showcased_projects (profile_id, repo_full_name, repo_key, repo_url, custom_title, custom_description)
  values (auth.uid(), trim(p_repo_full_name), canonical_key, p_repo_url, p_custom_title, p_custom_description)
  on conflict (profile_id, repo_key) do update set
    repo_full_name = excluded.repo_full_name,
    repo_url = excluded.repo_url,
    custom_title = excluded.custom_title,
    custom_description = excluded.custom_description
  returning * into saved;
  return saved;
end $$;

revoke all on function public.save_showcased_project(text, text, text, text) from public;
grant execute on function public.save_showcased_project(text, text, text, text) to authenticated;
