begin;

alter table public.showcased_projects add column if not exists source text not null default 'github';
alter table public.showcased_projects add column if not exists deployed_url text;
alter table public.showcased_projects alter column repo_full_name drop not null;
alter table public.showcased_projects alter column repo_url drop not null;
create unique index if not exists showcased_projects_profile_repo_key_idx on public.showcased_projects(profile_id,repo_key);

create or replace function public.valid_deployed_project_url(value text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare url_parts text[];
begin
  if value is null or value ~ '[[:space:][:cntrl:]]' then return false; end if;
  url_parts := regexp_match(value, '^https?://(\[[0-9a-f:]+\]|[a-z0-9]([a-z0-9.-]*[a-z0-9])?)(:([0-9]{1,5}))?([/?#][^[:space:][:cntrl:]]*)?$', 'i');
  if url_parts is null or coalesce(url_parts[4]::int, 0) > 65535 then return false; end if;
  if left(url_parts[1], 1) = '[' then
    return family(trim(both '[]' from url_parts[1])::inet) = 6;
  elsif url_parts[1] ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' then
    return family(url_parts[1]::inet) = 4;
  end if;
  return true;
exception when invalid_text_representation then return false;
end;
$$;

create or replace function public.enforce_showcase_project_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.source is distinct from old.source or new.id <> old.id or new.profile_id <> old.profile_id) then
    raise exception 'PROJECT_IDENTITY_IMMUTABLE';
  end if;
  if new.source = 'manual' then
    if coalesce(trim(new.custom_title), '') = '' then raise exception 'INVALID_PROJECT_TITLE'; end if;
    if not public.valid_deployed_project_url(new.deployed_url) then raise exception 'INVALID_DEPLOYED_URL'; end if;
    if new.repo_full_name is not null or new.repo_url is not null or new.show_repository_link then raise exception 'INVALID_MANUAL_REPOSITORY'; end if;
    new.repo_key := 'manual:' || new.id::text;
    new.custom_title := trim(new.custom_title);
  elsif new.source = 'github' then
    if coalesce(trim(new.repo_full_name), '') !~ '^[^/[:space:]]+/[^/[:space:]]+$' or new.repo_url is null then raise exception 'INVALID_REPOSITORY'; end if;
    new.repo_key := lower(trim(new.repo_full_name));
  else
    raise exception 'INVALID_PROJECT_SOURCE';
  end if;
  perform pg_advisory_xact_lock(hashtext(new.profile_id::text));
  if not exists (select 1 from public.showcased_projects where profile_id = new.profile_id and repo_key = new.repo_key)
    and (select count(*) from public.showcased_projects where profile_id = new.profile_id and id <> new.id) >= 3 then
    raise exception 'PROJECT_LIMIT_REACHED';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_showcase_project_limit on public.showcased_projects;
create trigger enforce_showcase_project_limit before insert or update on public.showcased_projects
for each row execute function public.enforce_showcase_project_limit();

drop function if exists public.save_showcased_project(text,text,text,text,text,boolean);
create or replace function public.save_showcased_project(
  p_repo_full_name text,
  p_repo_url text,
  p_custom_title text default null,
  p_custom_description text default null,
  p_screenshot_url text default null,
  p_show_repository_link boolean default null,
  p_source text default 'github',
  p_deployed_url text default null,
  p_project_id uuid default null
) returns public.showcased_projects
language plpgsql security definer set search_path = public as $$
declare
  saved public.showcased_projects;
  project_id uuid := coalesce(p_project_id, gen_random_uuid());
  canonical_key text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if p_source = 'manual' then
    if exists (select 1 from public.showcased_projects where id = project_id and profile_id <> auth.uid()) then raise exception 'PROJECT_OWNER_MISMATCH'; end if;
    if exists (select 1 from public.showcased_projects where id = project_id and source <> 'manual') then raise exception 'PROJECT_IDENTITY_IMMUTABLE'; end if;
    canonical_key := 'manual:' || project_id::text;
  elsif p_source = 'github' then
    canonical_key := lower(trim(p_repo_full_name));
    -- GitHub identity remains the repository, regardless of supplied project ID.
    project_id := gen_random_uuid();
  else
    raise exception 'INVALID_PROJECT_SOURCE';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  insert into public.showcased_projects (id, profile_id, source, deployed_url, repo_full_name, repo_key, repo_url, custom_title, custom_description, screenshot_url, show_repository_link)
  values (project_id, auth.uid(), p_source, p_deployed_url, p_repo_full_name, canonical_key, p_repo_url, p_custom_title, p_custom_description, p_screenshot_url, coalesce(p_show_repository_link, false))
  on conflict (profile_id, repo_key) do update set
    repo_full_name = excluded.repo_full_name,
    repo_url = excluded.repo_url,
    deployed_url = excluded.deployed_url,
    custom_title = excluded.custom_title,
    custom_description = excluded.custom_description,
    show_repository_link = coalesce(p_show_repository_link, public.showcased_projects.show_repository_link),
    screenshot_url = coalesce(excluded.screenshot_url, public.showcased_projects.screenshot_url)
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.save_showcased_project(text,text,text,text,text,boolean,text,text,uuid) from public;
grant execute on function public.save_showcased_project(text,text,text,text,text,boolean,text,text,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
