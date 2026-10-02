-- ==============================================================================
-- GitHub Portfolio Showcase: Supabase SQL Setup Script
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create Profiles Table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text unique not null,
  full_name text,
  headline text,
  avatar_url text,
  bio text,
  program text,          -- e.g. "BS Computer Science", "BS Information Technology"
  year_level text,       -- e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
  is_onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Schema migration helpers for existing installations
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists is_onboarded boolean default false;
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists year_level text;

-- 2. Create Showcased Projects Table
create table if not exists public.showcased_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,   -- e.g. "octocat/hello-world"
  repo_key text,                  -- e.g. "octocat/hello-world" (lowercase, trimmed)
  repo_url text not null,         -- e.g. "https://github.com/octocat/hello-world"
  custom_title text,              -- optional creator override for display
  custom_description text,        -- optional creator override for context/role
  is_featured boolean default false,
  display_order int default 0,
  added_at timestamptz default now(),
  constraint unique_profile_project unique (profile_id, repo_full_name)
);

alter table public.showcased_projects add column if not exists repo_key text;
update public.showcased_projects set repo_key = lower(trim(repo_full_name)) where repo_key is null;

-- 3. Create Repo Stats Cache Table (Shared caching across all users)
create table if not exists public.repo_stats_cache (
  repo_full_name text primary key,
  stars int default 0,
  forks int default 0,
  language text,
  topics text[] default '{}',
  last_commit_at timestamptz,
  fetched_at timestamptz default now(),
  description text,
  homepage text,
  refresh_after timestamptz default now()
);

alter table public.repo_stats_cache add column if not exists description text;
alter table public.repo_stats_cache add column if not exists homepage text;
alter table public.repo_stats_cache add column if not exists refresh_after timestamptz default now();

-- 4. High-Performance Database Indexes
-- Deduplicate any existing duplicate project rows before applying unique index
delete from public.showcased_projects
where ctid not in (
  select min(ctid)
  from public.showcased_projects
  group by profile_id, lower(repo_full_name)
);

create index if not exists idx_showcased_projects_profile_id 
  on public.showcased_projects(profile_id);

create unique index if not exists idx_showcased_projects_profile_repo_unique 
  on public.showcased_projects(profile_id, lower(repo_full_name));

create index if not exists idx_showcased_projects_display_order 
  on public.showcased_projects(display_order asc, added_at desc);

create index if not exists idx_profiles_program 
  on public.profiles(program);

create index if not exists idx_profiles_created_at 
  on public.profiles(created_at desc);

create index if not exists idx_profiles_username_lower 
  on public.profiles(lower(github_username));

-- 5. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.showcased_projects enable row level security;
alter table public.repo_stats_cache enable row level security;

-- 6. Drop existing policies if any (for clean rerun)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

drop policy if exists "Showcased projects are viewable by everyone" on public.showcased_projects;
drop policy if exists "Users can insert their own showcased projects" on public.showcased_projects;
drop policy if exists "Users can update their own showcased projects" on public.showcased_projects;
drop policy if exists "Users can delete their own showcased projects" on public.showcased_projects;

drop policy if exists "Repo stats cache is viewable by everyone" on public.repo_stats_cache;
drop policy if exists "Authenticated users can update repo cache" on public.repo_stats_cache;

-- 7. RLS Policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

create policy "Showcased projects are viewable by everyone"
  on public.showcased_projects for select
  using (true);

create policy "Users can insert their own showcased projects"
  on public.showcased_projects for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own showcased projects"
  on public.showcased_projects for update
  using (auth.uid() = profile_id);

create policy "Users can delete their own showcased projects"
  on public.showcased_projects for delete
  using (auth.uid() = profile_id);

create policy "Repo stats cache is viewable by everyone"
  on public.repo_stats_cache for select
  using (true);

create policy "Authenticated users can update repo cache"
  on public.repo_stats_cache for all
  using (auth.role() = 'authenticated');

-- 8. Trigger to auto-create Profile on first sign-in
create or replace function public.handle_new_user()
returns trigger as $$
declare
  github_handle text;
begin
  github_handle := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'creator'), '@', 1)
  );

  insert into public.profiles (id, github_username, full_name, avatar_url)
  values (
    new.id,
    github_handle,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', github_handle),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Account Deletion RPC function (deletes caller from auth.users, cascades to profiles and projects)
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

-- 10. Atomic Project Save RPC function
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
