-- Studio collaboration: three seats and review media retained for seven days.
alter table public.review_links
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists revoked_at timestamptz;

alter table public.review_links drop constraint if exists review_links_status_check;
alter table public.review_links
  add constraint review_links_status_check
  check (status in ('pending', 'approved', 'changes_requested', 'expired', 'revoked'));

update public.workspaces set seats = 3 where plan = 'studio' and seats < 3;

alter table public.workspace_members add column if not exists active boolean not null default true;
with ranked as (
  select id, row_number() over (partition by user_id order by created_at) as position
  from public.workspace_members
)
update public.workspace_members as member
set active = false
from ranked
where member.id = ranked.id and ranked.position > 1;
create unique index if not exists workspace_members_one_active_idx
  on public.workspace_members (user_id) where active;

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role = 'member'),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_invitations_workspace_idx
  on public.workspace_invitations (workspace_id, created_at desc);
create index if not exists workspace_invitations_email_idx
  on public.workspace_invitations (lower(email));

alter table public.workspace_invitations enable row level security;
revoke all on table public.workspace_invitations from anon, authenticated;

create or replace function private.cleanup_expired_storage()
returns integer
language plpgsql
security definer
set search_path = storage, public
as $$
declare
  deleted_count integer := 0;
  batch_count integer := 0;
begin
  update public.review_links
  set status = 'expired', updated_at = now()
  where expires_at <= now() and status not in ('expired', 'revoked');

  delete from storage.objects
  where bucket_id in ('uploads', 'exports')
    and created_at < now() - interval '24 hours';
  get diagnostics batch_count = row_count;
  deleted_count := deleted_count + batch_count;

  delete from storage.objects
  where bucket_id = 'reviews'
    and created_at < now() - interval '7 days';
  get diagnostics batch_count = row_count;
  deleted_count := deleted_count + batch_count;
  return deleted_count;
end;
$$;
