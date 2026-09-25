-- Storage metadata is never deleted directly: the API must remove the physical file.
create or replace function private.cleanup_expired_storage()
returns integer language plpgsql security definer set search_path = '' as $$
begin
  update public.review_links set status='expired', updated_at=now()
    where expires_at<=now() and status not in ('expired','revoked');
  return 0;
end $$;

create or replace function public.storage_cleanup_candidates(p_user_id uuid default null)
returns table(bucket_id text,name text) language sql security definer set search_path = '' as $$
  select o.bucket_id,o.name from storage.objects o where
  (p_user_id is null and (
    (o.bucket_id in ('uploads','exports') and o.created_at<=now()-interval '24 hours') or
    (o.bucket_id='reviews' and (o.created_at<=now()-interval '7 days' or exists(
      select 1 from public.review_links r where r.public_id=split_part(o.name,'/',1)
      and (r.revoked_at is not null or r.expires_at<=now())
    )))
  )) or (p_user_id is not null and (
    (o.bucket_id in ('uploads','exports') and split_part(o.name,'/',1)=p_user_id::text) or
    (o.bucket_id='exports' and exists(select 1 from public.export_sets e join public.workspace_members m on m.workspace_id=e.workspace_id
      where e.storage_path=o.name and m.user_id=p_user_id and m.role='owner')) or
    (o.bucket_id='reviews' and exists(select 1 from public.review_links r where r.public_id=split_part(o.name,'/',1) and
      (r.created_by=p_user_id or exists(select 1 from public.workspace_members m where m.workspace_id=r.workspace_id and m.user_id=p_user_id and m.role='owner'))))
  )) order by o.created_at,o.id limit 500;
$$;

create or replace function public.refund_abandoned_exports()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select id from public.export_reservations where state='reserved' and created_at<now()-interval '10 minutes' order by created_at limit 1000 loop
    perform public.finish_export(r.id,null); n:=n+1;
  end loop;
  perform private.cleanup_expired_storage();
  return n;
end $$;

-- Called only after Storage removal and billing cancellation have succeeded.
create or replace function public.erase_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.storage_cleanup_candidates(p_user_id)) then raise exception 'STORAGE_NOT_EMPTY'; end if;
  delete from public.workspaces w where exists(select 1 from public.workspace_members m where m.workspace_id=w.id and m.user_id=p_user_id and m.role='owner');
  delete from public.export_sets where created_by=p_user_id;
  delete from public.review_links where created_by=p_user_id;
  delete from public.workspace_invitations where invited_by=p_user_id;
  delete from auth.users where id=p_user_id;
end $$;
revoke all on function public.storage_cleanup_candidates(uuid) from public,anon,authenticated;
revoke all on function public.refund_abandoned_exports() from public,anon,authenticated;
revoke all on function public.erase_account(uuid) from public,anon,authenticated;
grant execute on function public.storage_cleanup_candidates(uuid) to service_role;
grant execute on function public.refund_abandoned_exports() to service_role;
grant execute on function public.erase_account(uuid) to service_role;
