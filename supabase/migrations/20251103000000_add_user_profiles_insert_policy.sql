-- Add RLS policy to allow users to insert their own profile
-- This allows users to create their profile when they first access the profile page

-- Drop policy if exists to avoid conflicts
drop policy if exists user_profiles_owner_insert on public.user_profiles;

-- Create policy to allow users to insert their own profile
create policy user_profiles_owner_insert on public.user_profiles
  for insert to authenticated
  with check (id = auth.uid());

