-- App Store Connect connector: one encrypted team API key per workspace and a
-- queued upload job kind. The private key is AES-256-GCM sealed by the app with
-- ASC_ENCRYPTION_KEY; the database never sees it in clear. Service role only.
create table public.asc_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  issuer_id text not null check (issuer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  key_id text not null check (key_id ~ '^[A-Z0-9]{10}$'),
  encrypted_private_key text not null check (octet_length(encrypted_private_key) <= 8192),
  iv text not null check (octet_length(iv) <= 64),
  auth_tag text not null check (octet_length(auth_tag) <= 64),
  -- Erasing the account that supplied the key erases the key with it.
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_verified_at timestamptz
);
alter table public.asc_connections enable row level security;
revoke all on public.asc_connections from public,anon,authenticated;
grant all on public.asc_connections to service_role;

alter table public.render_jobs drop constraint render_jobs_kind_check;
alter table public.render_jobs add constraint render_jobs_kind_check check (kind in ('export','review','asc_upload'));
-- Per-file progress for long jobs, readable through the existing own-row policy.
alter table public.render_jobs add column progress jsonb check (progress is null or octet_length(progress::text) <= 16384);

create or replace function public.enqueue_render(p_user uuid,p_workspace uuid,p_kind text,p_key uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare j public.render_jobs; r uuid; jid uuid;
begin
  perform pg_advisory_xact_lock(42626001);
  if p_kind not in ('export','review','asc_upload') then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=p_user and active) then raise exception 'NO_WORKSPACE'; end if;
  select * into j from public.render_jobs where user_id=p_user and request_key=p_key;
  if found then
    if j.kind<>p_kind or j.payload<>p_payload or j.workspace_id<>p_workspace then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return j.id;
  end if;
  if (select count(*) from public.render_jobs where state in ('queued','running')) >= 51 then raise exception 'RENDER_BUSY'; end if;
  if exists(select 1 from public.render_jobs where user_id=p_user and state in ('queued','running')) then raise exception 'RENDER_ALREADY_PENDING'; end if;
  if p_kind='export' then r:=public.reserve_export(p_workspace,p_user); end if;
  insert into public.render_jobs(user_id,workspace_id,kind,request_key,payload,reservation_id)
    values(p_user,p_workspace,p_kind,p_key,p_payload,r) returning id into jid;
  return jid;
end $$;

create function public.report_render_progress(p_job uuid,p_lease uuid,p_progress jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.render_jobs set progress=p_progress
    where id=p_job and lease_token=p_lease and state='running' and lease_until>=now();
  return found;
end $$;
revoke all on function public.enqueue_render(uuid,uuid,text,uuid,jsonb),public.report_render_progress(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_render(uuid,uuid,text,uuid,jsonb),public.report_render_progress(uuid,uuid,jsonb) to service_role;
