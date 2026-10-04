-- One-time "Pass 30 jours": a paid Checkout (mode payment) grants Indie quotas until
-- workspaces.pass_expires_at. Expiry is checked when entitlements are read; no cron.
-- workspace_passes is the idempotency ledger (one row per Checkout session) and is
-- service-role only. Members can read pass_expires_at with the rest of their
-- workspace row but cannot write it (column grants stay name/slug/client_slug).
alter table public.workspaces add column if not exists pass_expires_at timestamptz;

create table if not exists public.workspace_passes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  days integer not null check (days between 1 and 366),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists workspace_passes_workspace_idx on public.workspace_passes(workspace_id);
alter table public.workspace_passes enable row level security;
revoke all on public.workspace_passes from public, anon, authenticated;
grant all on public.workspace_passes to service_role;

-- Idempotent on the Checkout session: a repeated or concurrent delivery returns the
-- original grant without extending it again. A second pass extends from the later of
-- now and the current expiry.
create or replace function public.grant_workspace_pass(p_workspace_id uuid, p_session_id text, p_customer_id text, p_days integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; existing public.workspace_passes; expiry timestamptz;
begin
  select * into w from public.workspaces where id = p_workspace_id for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  select * into existing from public.workspace_passes where stripe_checkout_session_id = p_session_id;
  if found then
    if existing.workspace_id <> p_workspace_id then raise exception 'CUSTOMER_MISMATCH'; end if;
    return jsonb_build_object('granted', false, 'expires_at', existing.expires_at);
  end if;
  if w.stripe_customer_id is distinct from p_customer_id then raise exception 'CUSTOMER_MISMATCH'; end if;
  expiry := greatest(now(), coalesce(w.pass_expires_at, now())) + make_interval(days => p_days);
  insert into public.workspace_passes(workspace_id, stripe_checkout_session_id, days, expires_at)
    values (p_workspace_id, p_session_id, p_days, expiry);
  update public.workspaces set pass_expires_at = expiry where id = p_workspace_id;
  -- Release the completed Checkout attempt so the workspace can start a new purchase now.
  update public.checkout_attempts set expires_at = now() where workspace_id = p_workspace_id and session_id = p_session_id;
  return jsonb_build_object('granted', true, 'expires_at', expiry);
end $$;
revoke all on function public.grant_workspace_pass(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.grant_workspace_pass(uuid, text, text, integer) to service_role;

-- Same body as 20260925120000_export_delivery.sql, plus an unexpired pass counting as Indie.
create or replace function public.reserve_export(p_workspace_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; pro boolean; n integer; reservation uuid; today date := (now() at time zone 'UTC')::date;
begin
  select * into w from public.workspaces where id=p_workspace_id for update;
  if not found or not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id and active) then
    raise exception 'NO_WORKSPACE';
  end if;
  pro := coalesce(w.manual_plan in ('indie','studio'),false) or
    (w.stripe_subscription_id is not null and w.subscription_status in ('active','trialing') and w.plan in ('indie','studio')) or
    coalesce(w.pass_expires_at > now(), false);
  if pro then
    insert into public.daily_export_counts(workspace_id,day,count) values(p_workspace_id,today,0) on conflict do nothing;
    update public.daily_export_counts set count=count+1 where workspace_id=p_workspace_id and day=today and count<100 returning count into n;
    if n is null then raise exception 'DAILY_LIMIT'; end if;
  else
    update public.workspaces set free_exports_used=free_exports_used+1 where id=p_workspace_id and free_exports_used<2 returning free_exports_used into n;
    if n is null then raise exception 'TRIAL_EXHAUSTED'; end if;
  end if;
  insert into public.export_reservations(workspace_id,user_id,kind,quota_day)
    values(p_workspace_id,p_user_id,case when pro then 'daily' else 'free' end,today) returning id into reservation;
  return reservation;
end $$;
revoke all on function public.reserve_export(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_export(uuid,uuid) to service_role;
