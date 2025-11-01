-- Automatically delete user data when user is set as admin
-- When a user is inserted into admins table, delete their data from user_profiles,
-- user_project_info, and commissions tables

create or replace function public.delete_user_data_on_admin()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Delete user_project_info records
  delete from public.user_project_info
  where user_id = NEW.id;
  
  -- Delete commissions records
  delete from public.commissions
  where user_id = NEW.id;
  
  -- Delete user_profiles record
  delete from public.user_profiles
  where id = NEW.id;
  
  return NEW;
end;
$$;

-- Create trigger to execute the function after insert on admins
drop trigger if exists delete_user_data_on_admin_insert on public.admins;
create trigger delete_user_data_on_admin_insert
  after insert on public.admins
  for each row
  execute function public.delete_user_data_on_admin();

-- Also handle case when admin is updated (though id shouldn't change)
-- This ensures data stays deleted even if admin record is updated
create trigger delete_user_data_on_admin_update
  after update on public.admins
  for each row
  when (OLD.id = NEW.id)
  execute function public.delete_user_data_on_admin();

