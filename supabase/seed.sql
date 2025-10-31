-- Seed projects and map first existing user as admin/profile
-- Note: requires at least one user in auth.users (e.g., after inviting via admin)

insert into public.projects (name) values
  ('Project Alpha'),
  ('Project Beta')
on conflict do nothing;

do $$
declare
  first_user uuid;
begin
  select id into first_user from auth.users order by created_at asc limit 1;
  if first_user is null then
    raise notice 'No users in auth.users, skipping admin/profile seeds';
    return;
  end if;

  -- upsert profile for first user
  insert into public.user_profiles (id, email, name)
  select u.id, coalesce(u.email, 'noreply@example.com'), coalesce(u.raw_user_meta_data->>'name', split_part(coalesce(u.email,'user@example.com'),'@',1))
  from auth.users u where u.id = first_user
  on conflict (id) do update set email = excluded.email;

  -- make first user admin
  insert into public.admins (id, email, name)
  select u.id, coalesce(u.email,'noreply@example.com'), coalesce(u.raw_user_meta_data->>'name', null)
  from auth.users u where u.id = first_user
  on conflict (id) do nothing;

  -- connect user to projects with ref_percentage
  insert into public.user_project_info (project_id, user_id, ref_percentage)
  select p.id, first_user, 10.00 from public.projects p
  on conflict do nothing;

  -- create sample commissions
  insert into public.commissions (project_id, user_id, description, status, value)
  select p.id, first_user, 'Initial referral', 'requested', 100.00 from public.projects p limit 1;

  insert into public.commissions (project_id, user_id, description, status, value)
  select p.id, first_user, 'Approved referral', 'approved', 200.00 from public.projects p offset 1 limit 1;

  insert into public.commissions (project_id, user_id, description, status, value)
  select p.id, first_user, 'Claimed referral', 'claimed', 150.00 from public.projects p limit 1;
end $$;



