-- Optimistic revision prevents concurrent webhook snapshots overwriting each other.
alter table public.workspaces add column if not exists stripe_sync_version bigint not null default 0;
-- Persist one checkout attempt across retries, including a lost Stripe response.
create table public.checkout_attempts (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  attempt_id uuid not null default gen_random_uuid(),
  kind text not null,
  return_path text not null,
  session_id text,
  expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.checkout_attempts enable row level security;
revoke all on public.checkout_attempts from public,anon,authenticated;
grant all on public.checkout_attempts to service_role;
create or replace function public.begin_checkout(p_workspace_id uuid,p_kind text,p_return_path text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_attempts;
begin
  perform 1 from public.workspaces where id=p_workspace_id for update;
  select * into a from public.checkout_attempts where workspace_id=p_workspace_id;
  if found and a.expires_at>now() then return to_jsonb(a); end if;
  insert into public.checkout_attempts(workspace_id,kind,return_path) values(p_workspace_id,p_kind,p_return_path)
    on conflict(workspace_id) do update set attempt_id=gen_random_uuid(),kind=excluded.kind,return_path=excluded.return_path,session_id=null,expires_at=now()+interval '24 hours'
    returning * into a;
  return to_jsonb(a);
end $$;
revoke all on function public.begin_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.begin_checkout(uuid,text,text) to service_role;
