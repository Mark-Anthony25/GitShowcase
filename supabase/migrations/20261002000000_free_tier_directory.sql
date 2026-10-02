-- Free-tier directory: canonical project keys, secure cache, and durable saves.
alter table public.showcased_projects add column if not exists repo_key text;
update public.showcased_projects set repo_key = lower(trim(repo_full_name)) where repo_key is null;
alter table public.showcased_projects alter column repo_key set not null;

-- Expand first. This fails safely if case-only duplicates already exist; it leaves
-- the previous constraint untouched rather than deleting data or uniqueness.
create unique index if not exists showcased_projects_profile_repo_key_idx
  on public.showcased_projects (profile_id, repo_key);
create index if not exists idx_showcased_projects_added_at on public.showcased_projects (added_at desc, id desc);

alter table public.repo_stats_cache add column if not exists description text;
alter table public.repo_stats_cache add column if not exists homepage text;
alter table public.repo_stats_cache add column if not exists refresh_after timestamptz default now();

drop policy if exists "Authenticated users can update repo cache" on public.repo_stats_cache;

create or replace function public.save_showcased_project(
  p_repo_full_name text, p_repo_url text, p_custom_title text default null, p_custom_description text default null
) returns public.showcased_projects
language plpgsql security definer set search_path = public as $$
declare saved public.showcased_projects; canonical_key text := lower(trim(p_repo_full_name));
begin
  if auth.uid() is null or canonical_key = '' or position('/' in canonical_key) = 0 then raise exception 'INVALID_REPOSITORY'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if not exists (select 1 from public.showcased_projects sp where sp.profile_id = auth.uid() and sp.repo_key = canonical_key)
     and (select count(*) from public.showcased_projects where profile_id = auth.uid()) >= 3 then raise exception 'PROJECT_LIMIT_REACHED'; end if;
  insert into public.showcased_projects (profile_id, repo_full_name, repo_key, repo_url, custom_title, custom_description)
  values (auth.uid(), trim(p_repo_full_name), canonical_key, p_repo_url, p_custom_title, p_custom_description)
  on conflict (profile_id, repo_key) do update set repo_full_name = excluded.repo_full_name, repo_url = excluded.repo_url, custom_title = excluded.custom_title, custom_description = excluded.custom_description
  returning * into saved;
  return saved;
end $$;
revoke all on function public.save_showcased_project(text, text, text, text) from public;
grant execute on function public.save_showcased_project(text, text, text, text) to authenticated;
