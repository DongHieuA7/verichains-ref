-- Referral & Commission schema
set check_function_bodies = off;

create type public.commission_status as enum ('requested','approved','claimed');

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on update cascade on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text,
  admins uuid[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on update cascade on delete cascade,
  email text not null,
  name text,
  company text,
  descript text,
  ref_code text unique default replace(left(gen_random_uuid()::text, 8), '-', ''),
  created_at timestamptz not null default now()
);

create table if not exists public.user_project_info (
  project_id uuid not null references public.projects(id) on update cascade on delete cascade,
  user_id uuid not null references public.user_profiles(id) on update cascade on delete cascade,
  ref_percentage numeric(5,2) not null check (ref_percentage >= 0 and ref_percentage <= 100),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on update cascade on delete cascade,
  user_id uuid not null references public.user_profiles(id) on update cascade on delete cascade,
  description text,
  date timestamptz not null default now(),
  status public.commission_status not null default 'requested',
  value numeric not null,
  updated_at timestamptz
);

-- Triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

-- RLS
alter table public.admins enable row level security;
alter table public.projects enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_project_info enable row level security;
alter table public.commissions enable row level security;

-- admins: only admins can select/insert/update/delete
create policy admins_self_manage on public.admins
  for all to authenticated using (exists (select 1 from public.admins a where a.id = auth.uid())) with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- projects: admins can do everything; users can select
create policy projects_admin_full on public.projects
  for all to authenticated using (exists (select 1 from public.admins a where a.id = auth.uid())) with check (exists (select 1 from public.admins a where a.id = auth.uid()));
create policy projects_read_all on public.projects for select to authenticated using (true);

-- user_profiles: owners can select/update their row; admins can read all
create policy user_profiles_owner_rw on public.user_profiles
  for select using (id = auth.uid())
  with check (id = auth.uid());
create policy user_profiles_owner_update on public.user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy user_profiles_admin_read on public.user_profiles for select to authenticated using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- user_project_info: admins full; users can read their own entries
create policy upi_admin_full on public.user_project_info
  for all to authenticated using (exists (select 1 from public.admins a where a.id = auth.uid())) with check (exists (select 1 from public.admins a where a.id = auth.uid()));
create policy upi_user_read_own on public.user_project_info for select to authenticated using (user_id = auth.uid());

-- commissions: users can insert for themselves; update only when requested; select own; admins full
create policy commissions_user_insert on public.commissions for insert to authenticated with check (user_id = auth.uid());
create policy commissions_user_select_own on public.commissions for select to authenticated using (user_id = auth.uid());
create policy commissions_user_update_requested on public.commissions for update to authenticated using (user_id = auth.uid() and status = 'requested') with check (user_id = auth.uid() and status = 'requested');
create policy commissions_admin_full on public.commissions for all to authenticated using (exists (select 1 from public.admins a where a.id = auth.uid())) with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Helpers: view for statistics (optional)
create or replace view public.commission_stats as
select 
  user_id,
  project_id,
  sum(case when status = 'approved' then value else 0 end) as total_approved,
  sum(case when status = 'claimed' then value else 0 end) as total_claimed,
  count(*) filter (where status = 'requested') as requested_count,
  count(*) filter (where status = 'approved') as approved_count,
  count(*) filter (where status = 'claimed') as claimed_count
from public.commissions
group by user_id, project_id;

alter view public.commission_stats owner to postgres;
grant select on public.commission_stats to authenticated;





