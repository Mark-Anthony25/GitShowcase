-- Repair already-applied cover policies: preflight metadata differs from persisted object metadata.
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
