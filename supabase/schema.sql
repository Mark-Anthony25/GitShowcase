-- ==============================================================================
-- Student GitHub Project Showcase: Supabase SQL Setup Script
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

-- 2. Create Showcased Projects Table
create table if not exists public.showcased_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,   -- e.g. "octocat/hello-world"
  repo_url text not null,         -- e.g. "https://github.com/octocat/hello-world"
  custom_title text,              -- optional student override for display
  custom_description text,        -- optional student override for context/role
  is_featured boolean default false,
  display_order int default 0,
  added_at timestamptz default now(),
  constraint unique_profile_project unique (profile_id, repo_full_name)
);

-- 3. Create Repo Stats Cache Table (Shared caching across all users)
create table if not exists public.repo_stats_cache (
  repo_full_name text primary key,
  stars int default 0,
  forks int default 0,
  language text,
  topics text[] default '{}',
  last_commit_at timestamptz,
  fetched_at timestamptz default now()
);

-- 4. High-Performance Database Indexes
create index if not exists idx_showcased_projects_profile_id 
  on public.showcased_projects(profile_id);

create unique index if not exists idx_showcased_projects_profile_repo_unique 
  on public.showcased_projects(profile_id, lower(repo_full_name));

create index if not exists idx_showcased_projects_featured_order 
  on public.showcased_projects(is_featured desc, display_order asc, added_at desc);

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
    split_part(coalesce(new.email, 'student'), '@', 1)
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
