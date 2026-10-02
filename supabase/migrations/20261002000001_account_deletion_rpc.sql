-- Account deletion: allow self-deletion via RPC and profile RLS delete policy

-- 1. Add DELETE policy on public.profiles
drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using ((select auth.uid()) = id);

-- 2. Add delete_user RPC to completely remove caller from auth.users (cascades to profile and projects)
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
