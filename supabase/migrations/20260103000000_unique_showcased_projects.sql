-- Migration: Ensure uniqueness for showcased projects per student profile
-- Prevents duplicate project associations at the database layer

-- 1. Remove any existing duplicate project rows (keeping the latest record)
delete from public.showcased_projects a
using public.showcased_projects b
where a.id < b.id
  and a.profile_id = b.profile_id
  and lower(a.repo_full_name) = lower(b.repo_full_name);

-- 2. Create unique index on (profile_id, lower(repo_full_name))
create unique index if not exists idx_showcased_projects_profile_repo_unique
  on public.showcased_projects (profile_id, lower(repo_full_name));

-- 3. Add explicit unique constraint for (profile_id, repo_full_name) if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'unique_profile_project'
  ) then
    alter table public.showcased_projects 
      add constraint unique_profile_project unique (profile_id, repo_full_name);
  end if;
exception
  when others then
    -- Index already provides uniqueness guarantee
    null;
end $$;
