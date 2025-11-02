-- Add client_name field to commissions table
alter table public.commissions
  add column if not exists client_name text;

-- Add comment
comment on column public.commissions.client_name is 'Client name for the commission request';

