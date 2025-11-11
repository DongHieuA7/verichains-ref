-- Fix user_profiles SELECT policy to ensure users can read their own profile
-- The previous policy had both 'for select' and 'with check' which may cause issues

-- Drop the existing policy
drop policy if exists user_profiles_owner_rw on public.user_profiles;

-- Create separate policies for SELECT and UPDATE
-- SELECT policy: users can read their own profile
create policy user_profiles_owner_select on public.user_profiles
  for select to authenticated
  using (id = auth.uid());

-- UPDATE policy already exists as user_profiles_owner_update, keep it

