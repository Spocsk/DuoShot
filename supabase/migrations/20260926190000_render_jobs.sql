-- Private durable queue. A single leased render runs globally on the CX23.
create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('export','review')),
  request_key uuid not null,
  payload jsonb not null,
  state text not null default 'queued' check (state in ('queued','running','completed','failed')),
  reservation_id uuid references public.export_reservations(id) on delete cascade,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(user_id,request_key),
  check (octet_length(payload::text) <= 65536)
);
create index render_jobs_pending_idx on public.render_jobs(created_at,id) where state in ('queued','running');
alter table public.render_jobs enable row level security;
revoke all on public.render_jobs from public,anon,authenticated;
grant select on public.render_jobs to authenticated;
grant all on public.render_jobs to service_role;
create policy render_jobs_read_own on public.render_jobs for select to authenticated using(user_id=(select auth.uid()));
alter table public.review_links add column render_job_id uuid references public.render_jobs(id) on delete set null;
create index review_links_render_job_idx on public.review_links(render_job_id) where render_job_id is not null;

create function public.enqueue_render(p_user uuid,p_workspace uuid,p_kind text,p_key uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare j public.render_jobs; r uuid; jid uuid;
begin
  perform pg_advisory_xact_lock(42626001);
  if p_kind not in ('export','review') then raise exception 'INVALID_REQUEST'; end if;
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

create function public.claim_render()
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.render_jobs;
begin
  perform pg_advisory_xact_lock(42626002);
  -- A crashed attempt can be retried with the same quota reservation. Its old
  -- token can never commit a result or refund after the lease has expired.
  for j in select * from public.render_jobs where
    (state='running' and lease_until<now()) or (state='queued' and created_at<now()-interval '30 minutes')
    for update loop
    update public.review_links set revoked_at=now(),status='revoked' where render_job_id=j.id;
    if j.attempts>=3 or j.created_at<now()-interval '30 minutes' then
      if j.reservation_id is not null then perform public.finish_export(j.reservation_id,null); end if;
      update public.render_jobs set state='failed',error_code='RENDER_INTERRUPTED',finished_at=now(),lease_token=null,lease_until=null where id=j.id;
    else
      update public.render_jobs set state='queued',lease_token=null,lease_until=null where id=j.id;
    end if;
  end loop;
  delete from public.render_jobs where finished_at<now()-interval '24 hours';
  if exists(select 1 from public.render_jobs where state='running') then return null; end if;
  select * into j from public.render_jobs where state='queued' order by created_at,id limit 1 for update skip locked;
  if not found then return null; end if;
  update public.render_jobs set state='running',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds'
    where id=j.id returning * into j;
  return to_jsonb(j);
end $$;

create function public.heartbeat_render(p_job uuid,p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.render_jobs set lease_until=now()+interval '90 seconds'
    where id=p_job and lease_token=p_lease and state='running' and lease_until>=now();
  return found;
end $$;

create function public.complete_render(p_job uuid,p_lease uuid,p_result jsonb,p_export jsonb default null,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
declare j public.render_jobs;
begin
  select * into j from public.render_jobs where id=p_job for update;
  if not found or j.state<>'running' or j.lease_token is distinct from p_lease or j.lease_until<now() then raise exception 'RENDER_LEASE_LOST'; end if;
  if p_error is null and (p_result is null or (j.kind='export' and p_export is null)) then raise exception 'INVALID_RESULT'; end if;
  if j.reservation_id is not null then
    perform public.finish_export(j.reservation_id,case when p_error is null then p_export else null end);
  end if;
  if p_error is not null then
    update public.review_links set revoked_at=now(),status='revoked' where render_job_id=j.id;
  end if;
  update public.render_jobs set state=case when p_error is null then 'completed' else 'failed' end,
    result=case when p_error is not null then null when j.kind='export' then p_result-'url'-'expiresAt' else p_result end,
    error_code=p_error,finished_at=now(),lease_until=null where id=j.id;
end $$;

-- A queued render can wait more than ten minutes: its reservation belongs to
-- the durable queue and must not be refunded by the old synchronous janitor.
create or replace function public.refund_abandoned_exports()
returns integer language plpgsql security definer set search_path='' as $$
declare r record; n integer:=0;
begin
  for r in select e.id from public.export_reservations e where e.state='reserved'
    and e.created_at<now()-interval '10 minutes'
    and not exists(select 1 from public.render_jobs j where j.reservation_id=e.id and j.state in ('queued','running'))
    order by e.created_at limit 1000 loop
    perform public.finish_export(r.id,null); n:=n+1;
  end loop;
  perform private.cleanup_expired_storage();
  return n;
end $$;
revoke all on function public.enqueue_render(uuid,uuid,text,uuid,jsonb),public.claim_render(),public.heartbeat_render(uuid,uuid),public.complete_render(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.enqueue_render(uuid,uuid,text,uuid,jsonb),public.claim_render(),public.heartbeat_render(uuid,uuid),public.complete_render(uuid,uuid,jsonb,jsonb,text) to service_role;
