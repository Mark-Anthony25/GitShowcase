-- Migration: Add Performance Indexes for Supabase Resource & Query Optimization

create index if not exists idx_showcased_projects_profile_id 
  on public.showcased_projects(profile_id);

create index if not exists idx_showcased_projects_featured_order 
  on public.showcased_projects(is_featured desc, display_order asc, added_at desc);

create index if not exists idx_profiles_program 
  on public.profiles(program);

create index if not exists idx_profiles_created_at 
  on public.profiles(created_at desc);

create index if not exists idx_profiles_username_lower 
  on public.profiles(lower(github_username));
