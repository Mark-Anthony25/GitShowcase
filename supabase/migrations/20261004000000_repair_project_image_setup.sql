-- Repair existing GitShowcase installations without deleting project rows or files.
-- Run once in the affected project's Supabase SQL Editor; safe to re-run.
begin;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists is_onboarded boolean default false;
alter table public.showcased_projects add column if not exists screenshot_url text;
alter table public.showcased_projects add column if not exists repo_key text;
update public.showcased_projects set repo_key=lower(trim(repo_full_name)) where repo_key is distinct from lower(trim(repo_full_name));
-- Duplicate canonical repositories abort the transaction instead of deleting data.
create unique index if not exists showcased_projects_profile_repo_key_idx on public.showcased_projects(profile_id,repo_key);
-- Remove the obsolete overload so PostgREST can resolve the current save contract.
drop function if exists public.save_showcased_project(text,text,text,text);
create or replace function public.save_showcased_project(
  p_repo_full_name text,
  p_repo_url text,
  p_custom_title text default null,
  p_custom_description text default null,
  p_screenshot_url text default null
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
  insert into public.showcased_projects (profile_id, repo_full_name, repo_key, repo_url, custom_title, custom_description, screenshot_url)
  values (auth.uid(), trim(p_repo_full_name), canonical_key, p_repo_url, p_custom_title, p_custom_description, p_screenshot_url)
  on conflict (profile_id, repo_key) do update set
    repo_full_name = excluded.repo_full_name,
    repo_url = excluded.repo_url,
    custom_title = excluded.custom_title,
    custom_description = excluded.custom_description,
    screenshot_url = coalesce(excluded.screenshot_url, public.showcased_projects.screenshot_url)
  returning * into saved;
  return saved;
end $$;

revoke all on function public.save_showcased_project(text, text, text, text, text) from public;
grant execute on function public.save_showcased_project(text, text, text, text, text) to authenticated;

-- 11. Storage Bucket for Project Screenshots
-- One still image per existing owned project, max 200 KiB, no arbitrary folders.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('project-screenshots','project-screenshots',true,204800,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users can upload their own project screenshots" on storage.objects;
drop policy if exists "Users can update their own project screenshots" on storage.objects;
drop policy if exists "Project cover insert" on storage.objects;
drop policy if exists "Project cover update" on storage.objects;
drop policy if exists "Project cover delete" on storage.objects;

create or replace function public.valid_project_cover(object_name text, object_metadata jsonb)
returns boolean language sql volatile set search_path = '' as $$
  select split_part(object_name,'/',1) = (select auth.uid())::text
    and split_part(object_name,'/',3) = 'cover'
    and array_length(string_to_array(object_name,'/'),1) = 3
    -- Storage preflight uses contentLength; persisted objects use size.
    -- Older/streaming preflights can omit metadata; the bucket enforces actual bytes/MIME.
    and (object_metadata->>'mimetype' is null
      or object_metadata->>'mimetype' in ('image/jpeg','image/png','image/webp'))
    and (coalesce(object_metadata->>'size',object_metadata->>'contentLength') is null
      or coalesce(object_metadata->>'size',object_metadata->>'contentLength')::bigint between 1 and 204800)
    and exists (select 1 from public.showcased_projects p
      where p.id::text = split_part(object_name,'/',2) and p.profile_id = (select auth.uid()) for key share);
$$;
create policy "Project cover insert" on storage.objects for insert to authenticated
with check (bucket_id='project-screenshots' and public.valid_project_cover(name,metadata));
create policy "Project cover update" on storage.objects for update to authenticated
using (bucket_id='project-screenshots' and split_part(name,'/',1)=(select auth.uid())::text)
with check (bucket_id='project-screenshots' and public.valid_project_cover(name,metadata));
create policy "Project cover delete" on storage.objects for delete to authenticated
using (bucket_id='project-screenshots' and split_part(name,'/',1)=(select auth.uid())::text);
-- Restrictive gates prevent older permissive policies from bypassing new restrictions.
drop policy if exists "Cover insert guard" on storage.objects;
create policy "Cover insert guard" on storage.objects as restrictive for insert to public
with check (bucket_id <> 'project-screenshots' or public.valid_project_cover(name,metadata));
drop policy if exists "Cover update guard" on storage.objects;
create policy "Cover update guard" on storage.objects as restrictive for update to public
using (bucket_id <> 'project-screenshots' or split_part(name,'/',1)=(select auth.uid())::text)
with check (bucket_id <> 'project-screenshots' or public.valid_project_cover(name,metadata));
drop policy if exists "Cover delete guard" on storage.objects;
create policy "Cover delete guard" on storage.objects as restrictive for delete to public
using (bucket_id <> 'project-screenshots' or split_part(name,'/',1)=(select auth.uid())::text);

-- Fail closed on direct SQL/RPC/cascade deletion; use Storage API before row deletion.
create or replace function public.require_cover_cleanup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from storage.objects o where o.bucket_id='project-screenshots'
    and (o.name=old.profile_id::text||'/'||old.id::text||'/cover'
      or (old.screenshot_url is not null and position('/project-screenshots/'||o.name in old.screenshot_url)>0))) then
    raise exception 'Delete the project preview through the Storage API before removing the project.';
  end if;
  return old;
end;
$$;
drop trigger if exists require_cover_cleanup on public.showcased_projects;
create trigger require_cover_cleanup before delete on public.showcased_projects
for each row execute function public.require_cover_cleanup();

create or replace function public.enforce_showcase_project_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.repo_key := lower(trim(new.repo_full_name));
  perform pg_advisory_xact_lock(hashtext(new.profile_id::text));
  if not exists (select 1 from public.showcased_projects where profile_id=new.profile_id and repo_key=new.repo_key)
    and (select count(*) from public.showcased_projects where profile_id=new.profile_id and id<>new.id) >= 3 then
    raise exception 'PROJECT_LIMIT_REACHED';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_showcase_project_limit on public.showcased_projects;
create trigger enforce_showcase_project_limit before insert or update of profile_id on public.showcased_projects
for each row execute function public.enforce_showcase_project_limit();


drop policy if exists "Public screenshots are viewable by everyone" on storage.objects;
create policy "Public screenshots are viewable by everyone" on storage.objects for select using (bucket_id='project-screenshots');

notify pgrst, 'reload schema';
commit;
