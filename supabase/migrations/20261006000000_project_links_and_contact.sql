-- Preserve existing links; new projects require an explicit opt-in.
alter table public.profiles add column if not exists contact_url text;
alter table public.showcased_projects add column if not exists show_repository_link boolean not null default true;
alter table public.showcased_projects alter column show_repository_link set default false;
drop function if exists public.save_showcased_project(text,text,text,text);
drop function if exists public.save_showcased_project(text,text,text,text,text);
create or replace function public.save_showcased_project(
  p_repo_full_name text,
  p_repo_url text,
  p_custom_title text default null,
  p_custom_description text default null,
  p_screenshot_url text default null,
  p_show_repository_link boolean default null
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
  insert into public.showcased_projects (profile_id, repo_full_name, repo_key, repo_url, custom_title, custom_description, screenshot_url, show_repository_link)
  values (auth.uid(), trim(p_repo_full_name), canonical_key, p_repo_url, p_custom_title, p_custom_description, p_screenshot_url, coalesce(p_show_repository_link, false))
  on conflict (profile_id, repo_key) do update set
    repo_full_name = excluded.repo_full_name,
    repo_url = excluded.repo_url,
    custom_title = excluded.custom_title,
    custom_description = excluded.custom_description,
    show_repository_link = coalesce(p_show_repository_link, public.showcased_projects.show_repository_link),
    screenshot_url = coalesce(excluded.screenshot_url, public.showcased_projects.screenshot_url)
  returning * into saved;
  return saved;
end $$;

revoke all on function public.save_showcased_project(text, text, text, text, text, boolean) from public;
grant execute on function public.save_showcased_project(text, text, text, text, text, boolean) to authenticated;
