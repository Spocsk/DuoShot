-- Security and robustness hardening (stream D). Every statement is idempotent.

-- Public review decisions: the API caps comments at 2000 characters (COMMENT_TOO_LONG);
-- the database enforces the same bound. VALIDATE fails if an older row exceeds it; check
-- first with: select count(*) from public.review_links where char_length(comment) > 2000;
alter table public.review_links drop constraint if exists review_links_comment_length;
alter table public.review_links
  add constraint review_links_comment_length check (comment is null or char_length(comment) <= 2000) not valid;
alter table public.review_links validate constraint review_links_comment_length;

-- Member emails in one query instead of one Auth Admin call per member. Service role only:
-- it reads auth.users, and the API checks ownership before calling it.
create or replace function public.workspace_member_emails(p_workspace uuid)
returns table(user_id uuid, email text) language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text from public.workspace_members m
  join auth.users u on u.id = m.user_id where m.workspace_id = p_workspace;
$$;
revoke all on function public.workspace_member_emails(uuid) from public,anon,authenticated;
grant execute on function public.workspace_member_emails(uuid) to service_role;

-- Uploads are content-addressed (<user>/<sha256>.<ext>) and reused while they exist, so a
-- source can be older than 24 hours when a job uses it. The scheduled sweep keeps uploads
-- still named by a queued or running render job; account erasure (p_user_id) is unchanged.
create or replace function public.storage_cleanup_candidates(p_user_id uuid default null)
returns table(bucket_id text,name text) language sql security definer set search_path = '' as $$
  select o.bucket_id,o.name from storage.objects o where
  (p_user_id is null and (
    (o.bucket_id='uploads' and o.created_at<=now()-interval '24 hours' and not exists(
      select 1 from public.render_jobs j where j.state in ('queued','running') and (
        coalesce(j.payload->'outerPaths','[]'::jsonb) ? o.name or
        coalesce(j.payload->'innerPaths','[]'::jsonb) ? o.name or
        coalesce(j.payload->'paths','[]'::jsonb) ? o.name)
    )) or
    (o.bucket_id='exports' and o.created_at<=now()-interval '24 hours') or
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
revoke all on function public.storage_cleanup_candidates(uuid) from public,anon,authenticated;
grant execute on function public.storage_cleanup_candidates(uuid) to service_role;
