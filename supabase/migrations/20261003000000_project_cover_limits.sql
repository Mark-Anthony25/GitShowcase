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
    and coalesce(object_metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp')
    and coalesce((object_metadata->>'size')::bigint,0) between 1 and 204800
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
