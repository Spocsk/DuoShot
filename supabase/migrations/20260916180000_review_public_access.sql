-- Client review links must work without SUPABASE_SERVICE_ROLE_KEY:
-- public GET/decision via SECURITY DEFINER RPCs (no table leak),
-- member uploads via storage RLS, public media via public bucket.

update storage.buckets
set public = true
where id = 'reviews';

drop policy if exists reviews_select_public on storage.objects;
create policy reviews_select_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'reviews');

drop policy if exists reviews_insert_member on storage.objects;
create policy reviews_insert_member
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'reviews'
    and exists (
      select 1
      from public.workspace_members m
      where m.user_id = auth.uid()
        and m.active
    )
  );

drop policy if exists reviews_update_member on storage.objects;
create policy reviews_update_member
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'reviews'
    and exists (
      select 1
      from public.workspace_members m
      where m.user_id = auth.uid()
        and m.active
    )
  )
  with check (
    bucket_id = 'reviews'
    and exists (
      select 1
      from public.workspace_members m
      where m.user_id = auth.uid()
        and m.active
    )
  );

drop policy if exists reviews_delete_member on storage.objects;
create policy reviews_delete_member
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'reviews'
    and exists (
      select 1
      from public.workspace_members m
      where m.user_id = auth.uid()
        and m.active
    )
  );

create or replace function public.get_review_payload(pid text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec public.review_links%rowtype;
  slides jsonb;
begin
  if pid is null or length(trim(pid)) < 6 then
    return null;
  end if;

  select * into rec
  from public.review_links
  where public_id = pid;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slide_index', s.slide_index,
        'clone_label', s.clone_label
      )
      order by s.slide_index
    ),
    '[]'::jsonb
  )
  into slides
  from public.review_slides s
  where s.review_id = rec.id;

  return jsonb_build_object(
    'id', rec.id,
    'public_id', rec.public_id,
    'set_name', rec.set_name,
    'client_name', rec.client_name,
    'orientation', rec.orientation,
    'status', rec.status,
    'comment', rec.comment,
    'expires_at', rec.expires_at,
    'revoked_at', rec.revoked_at,
    'slides', slides
  );
end;
$$;

revoke all on function public.get_review_payload(text) from public;
grant execute on function public.get_review_payload(text) to anon, authenticated;

create or replace function public.submit_review_decision(
  pid text,
  new_status text,
  new_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.review_links%rowtype;
begin
  if new_status is null or new_status not in ('approved', 'changes_requested') then
    return jsonb_build_object('error', 'INVALID_STATUS');
  end if;

  select * into rec
  from public.review_links
  where public_id = pid
  for update;

  if not found then
    return jsonb_build_object('error', 'NOT_FOUND');
  end if;
  if rec.revoked_at is not null or rec.status = 'revoked' then
    return jsonb_build_object('error', 'REVOKED');
  end if;
  if rec.status = 'expired' or (rec.expires_at is not null and rec.expires_at <= now()) then
    return jsonb_build_object('error', 'EXPIRED');
  end if;

  update public.review_links
  set status = new_status,
      comment = new_comment,
      updated_at = now()
  where id = rec.id;

  return jsonb_build_object(
    'ok', true,
    'public_id', rec.public_id,
    'status', new_status,
    'comment', new_comment
  );
end;
$$;

revoke all on function public.submit_review_decision(text, text, text) from public;
grant execute on function public.submit_review_decision(text, text, text) to anon, authenticated;
