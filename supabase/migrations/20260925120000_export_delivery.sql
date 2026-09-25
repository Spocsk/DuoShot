-- Apply after billing_lifecycle. Quotas and export registration commit atomically.
alter table public.export_sets add column if not exists filename text not null default 'duoshot.zip';
create table if not exists public.export_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('free','daily')),
  quota_day date not null default (now() at time zone 'UTC')::date,
  state text not null default 'reserved' check(state in ('reserved','completed','refunded')),
  created_at timestamptz not null default now()
);
alter table public.export_reservations enable row level security;
revoke all on public.export_reservations from public, anon, authenticated;
grant all on public.export_reservations to service_role;
create index if not exists export_reservations_pending_idx on public.export_reservations(created_at) where state='reserved';

create or replace function public.reserve_export(p_workspace_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; pro boolean; n integer; reservation uuid; today date := (now() at time zone 'UTC')::date;
begin
  select * into w from public.workspaces where id=p_workspace_id for update;
  if not found or not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id and active) then
    raise exception 'NO_WORKSPACE';
  end if;
  pro := coalesce(w.manual_plan in ('indie','studio'),false) or
    (w.stripe_subscription_id is not null and w.subscription_status in ('active','trialing') and w.plan in ('indie','studio'));
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

create or replace function public.finish_export(p_reservation uuid, p_export jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.export_reservations;
begin
  select * into r from public.export_reservations where id=p_reservation for update;
  if not found then raise exception 'RESERVATION_MISSING'; end if;
  if r.state <> 'reserved' then return; end if;
  if p_export is null then
    if r.kind='free' then
      update public.workspaces set free_exports_used=greatest(0,free_exports_used-1) where id=r.workspace_id;
    else
      update public.daily_export_counts set count=greatest(0,count-1) where workspace_id=r.workspace_id and day=r.quota_day;
    end if;
    update public.export_reservations set state='refunded' where id=r.id;
  else
    insert into public.export_sets(id,workspace_id,created_by,orientation,include_69,fit_mode,background_mode,format,image_count,storage_path,filename)
      values(r.id,r.workspace_id,r.user_id,p_export->>'orientation',(p_export->>'include_69')::boolean,
        p_export->>'fit_mode',p_export->>'background_mode',p_export->>'format',(p_export->>'image_count')::integer,
        p_export->>'storage_path',p_export->>'filename');
    update public.export_reservations set state='completed' where id=r.id;
  end if;
end $$;
revoke all on function public.reserve_export(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_export(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_export(uuid,uuid) to service_role;
grant execute on function public.finish_export(uuid,jsonb) to service_role;
