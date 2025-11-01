-- Add RLS policy to allow admins to delete user_profiles
-- This allows admins to delete users from the admin users page

drop policy if exists user_profiles_admin_delete on public.user_profiles;

create policy user_profiles_admin_delete on public.user_profiles
  for delete to authenticated
  using (public.is_admin(auth.uid()));

