-- Create table for project join requests
create type public.join_request_status as enum ('pending','approved','rejected');

create table if not exists public.project_join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on update cascade on delete cascade,
  user_id uuid not null references public.user_profiles(id) on update cascade on delete cascade,
  message text,
  ref_percentage numeric(5,2) check (ref_percentage >= 0 and ref_percentage <= 100),
  status public.join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Unique constraint: one pending request per user per project
create unique index if not exists idx_project_join_requests_unique_pending
on public.project_join_requests(project_id, user_id)
where status = 'pending';

-- Add index for faster queries
create index if not exists idx_project_join_requests_project_status on public.project_join_requests(project_id, status);
create index if not exists idx_project_join_requests_user on public.project_join_requests(user_id);

-- Enable RLS
alter table public.project_join_requests enable row level security;

-- Policies
-- Users can insert their own requests
create policy project_join_requests_user_insert on public.project_join_requests
  for insert to authenticated
  with check (user_id = auth.uid());

-- Users can read their own requests
create policy project_join_requests_user_read on public.project_join_requests
  for select to authenticated
  using (user_id = auth.uid());

-- Admins can read all requests for projects they manage
-- Note: This uses is_admin() function if it exists, otherwise falls back to direct query
create policy project_join_requests_admin_read on public.project_join_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_join_requests.project_id
      and (p.admins @> array[auth.uid()]::uuid[] or public.is_admin(auth.uid()))
    )
  );

-- Admins can update requests for projects they manage
create policy project_join_requests_admin_update on public.project_join_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_join_requests.project_id
      and (p.admins @> array[auth.uid()]::uuid[] or public.is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_join_requests.project_id
      and (p.admins @> array[auth.uid()]::uuid[] or public.is_admin(auth.uid()))
    )
  );

-- Trigger to set updated_at
create trigger project_join_requests_set_updated_at
before update on public.project_join_requests
for each row execute function public.set_updated_at();

