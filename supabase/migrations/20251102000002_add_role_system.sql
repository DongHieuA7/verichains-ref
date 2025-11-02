-- Add role system to distinguish between Global Admin and Project Owner
-- Global Admin: Can manage all projects and users
-- Project Owner: Admin of specific projects (stored in projects.admins array)

-- Add role column to admins table to distinguish global admin vs regular admin
-- For now, all existing admins are global admins
alter table public.admins
  add column if not exists role text default 'global_admin' check (role in ('global_admin', 'project_owner'));

-- Update existing admins to be global admins
update public.admins set role = 'global_admin' where role is null;

-- Add comment to explain the role system
comment on column public.admins.role is 'Role type: global_admin (can manage all projects) or project_owner (managed via projects.admins array)';

-- Helper function to check if user is global admin
create or replace function public.is_global_admin(user_id uuid)
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
    where id = user_id and role = 'global_admin'
  );
end;
$$;

-- Helper function to check if user is project owner (admin of a specific project)
create or replace function public.is_project_owner(user_id uuid, project_id_param uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 
    from public.projects 
    where id = project_id_param 
    and user_id = any(admins)
  );
end;
$$;

-- Helper function to check if user can manage project (either global admin or project owner)
create or replace function public.can_manage_project(user_id uuid, project_id_param uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- Global admins can manage all projects
  if public.is_global_admin(user_id) then
    return true;
  end if;
  
  -- Project owners can manage their projects
  return public.is_project_owner(user_id, project_id_param);
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_global_admin(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid, uuid) to authenticated;
grant execute on function public.can_manage_project(uuid, uuid) to authenticated;

-- Note: 
-- - Global Admins: Have entry in admins table with role='global_admin', can manage ALL projects
-- - Project Owners: Listed in projects.admins array, can manage ONLY their assigned projects
-- - Use is_global_admin() to check global admin status
-- - Use is_project_owner(user_id, project_id) to check project owner status
-- - Use can_manage_project(user_id, project_id) to check if user can manage a specific project

