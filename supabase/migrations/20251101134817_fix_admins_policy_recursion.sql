-- Fix infinite recursion in admins table RLS policy
-- Create a helper function that bypasses RLS to check admin status

create or replace function public.is_admin(user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 
    from public.admins 
    where id = user_id
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_admin(uuid) to authenticated;

-- Drop the old policy that causes infinite recursion
drop policy if exists admins_self_manage on public.admins;

-- Create new policies using the helper function
-- Admins can read all admin records
create policy admins_select on public.admins
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- Admins can insert new admin records (only via service role in practice)
create policy admins_insert on public.admins
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- Admins can update admin records
create policy admins_update on public.admins
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Admins can delete admin records
create policy admins_delete on public.admins
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- Fix other policies that also reference admins table directly
-- These also need to use the helper function to avoid recursion

drop policy if exists projects_admin_full on public.projects;
create policy projects_admin_full on public.projects
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists user_profiles_admin_read on public.user_profiles;
create policy user_profiles_admin_read on public.user_profiles
  for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists upi_admin_full on public.user_project_info;
create policy upi_admin_full on public.user_project_info
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists commissions_admin_full on public.commissions;
create policy commissions_admin_full on public.commissions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

