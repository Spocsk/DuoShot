-- DuoShot v1.0 schema, RLS, storage buckets, 24h retention helper.
-- Authorization uses tables + auth.uid(), never user_metadata.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'indie', 'studio')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  seats integer not null default 1 check (seats >= 1),
  client_slug text,
  launch_offer_until timestamptz,
  extra_app_packs integer not null default 0 check (extra_app_packs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table public.export_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  app_id uuid references public.apps(id) on delete set null,
  orientation text not null check (orientation in ('portrait', 'landscape')),
  include_69 boolean not null default false,
  fit_mode text not null,
  background_mode text not null,
  format text not null check (format in ('png', 'jpeg')),
  image_count integer not null check (image_count >= 1 and image_count <= 10),
  storage_path text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.daily_export_counts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (workspace_id, day)
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('privacy', 'age_16', 'terms')),
  accepted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table public.dsar_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('access', 'export', 'erasure')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index apps_workspace_id_idx on public.apps (workspace_id);
create index export_sets_workspace_id_idx on public.export_sets (workspace_id);
create index export_sets_created_by_idx on public.export_sets (created_by);
create index consent_events_user_id_idx on public.consent_events (user_id);
create index dsar_requests_user_id_idx on public.dsar_requests (user_id);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function private.set_updated_at();

create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function private.set_updated_at();

create or replace function private.is_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

create or replace function private.seat_limit(p_plan text)
returns integer
language sql
immutable
as $$
  select case when p_plan = 'studio' then 3 else 1 end;
$$;

create or replace function private.enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  member_count integer;
begin
  select plan into current_plan from public.workspaces where id = new.workspace_id;
  select count(*) into member_count from public.workspace_members where workspace_id = new.workspace_id;
  if member_count >= private.seat_limit(current_plan) then
    raise exception 'seat limit reached for plan %', current_plan;
  end if;
  return new;
end;
$$;

create trigger workspace_members_seat_limit
  before insert on public.workspace_members
  for each row execute function private.enforce_seat_limit();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  ws_slug text;
  ws_name text;
begin
  ws_slug := 'ws-' || substr(replace(new.id::text, '-', ''), 1, 12);
  ws_name := coalesce(nullif(split_part(new.email, '@', 1), ''), 'Workspace');
  insert into public.workspaces (name, slug, plan, seats)
  values (ws_name, ws_slug, 'free', 1)
  returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.increment_daily_export(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  if not private.is_member(p_workspace_id) then
    raise exception 'forbidden';
  end if;
  insert into public.daily_export_counts as c (workspace_id, day, count)
  values (p_workspace_id, (timezone('utc', now()))::date, 1)
  on conflict (workspace_id, day)
  do update set count = c.count + 1
  returning c.count into new_count;
  return new_count;
end;
$$;

create or replace function public.increment_daily_export(p_workspace_id uuid)
returns integer
language sql
security invoker
set search_path = public
as $$
  select private.increment_daily_export(p_workspace_id);
$$;

create or replace function private.erase_current_user()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.dsar_requests (user_id, type, status, processed_at)
  values (uid, 'erasure', 'processing', now());

  delete from public.workspaces w
  where exists (
    select 1 from public.workspace_members m
    where m.workspace_id = w.id and m.user_id = uid and m.role = 'owner'
  );

  delete from public.workspace_members where user_id = uid;
  delete from public.consent_events where user_id = uid;
  delete from public.dsar_requests where user_id = uid and type <> 'erasure';

  delete from storage.objects
  where bucket_id in ('uploads', 'exports')
    and split_part(name, '/', 1) = uid::text;

  delete from auth.users where id = uid;
end;
$$;

create or replace function public.erase_current_user()
returns void
language sql
security invoker
set search_path = public
as $$
  select private.erase_current_user();
$$;

create or replace function private.cleanup_expired_storage()
returns integer
language plpgsql
security definer
set search_path = storage
as $$
declare
  deleted_count integer;
begin
  delete from storage.objects
  where bucket_id in ('uploads', 'exports')
    and created_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.apps enable row level security;
alter table public.export_sets enable row level security;
alter table public.daily_export_counts enable row level security;
alter table public.consent_events enable row level security;
alter table public.dsar_requests enable row level security;

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.apps from anon, authenticated;
revoke all on table public.export_sets from anon, authenticated;
revoke all on table public.daily_export_counts from anon, authenticated;
revoke all on table public.consent_events from anon, authenticated;
revoke all on table public.dsar_requests from anon, authenticated;

grant select on table public.workspaces to authenticated;
grant update (name, slug, client_slug) on table public.workspaces to authenticated;

grant select, insert, delete on table public.workspace_members to authenticated;

grant select, insert, update, delete on table public.apps to authenticated;
grant select, insert on table public.export_sets to authenticated;
grant select on table public.daily_export_counts to authenticated;
grant select, insert on table public.consent_events to authenticated;
grant select, insert on table public.dsar_requests to authenticated;

create policy workspaces_select_member
  on public.workspaces for select to authenticated
  using (private.is_member(id));

create policy workspaces_update_owner
  on public.workspaces for update to authenticated
  using (private.is_owner(id))
  with check (private.is_owner(id));

create policy workspace_members_select
  on public.workspace_members for select to authenticated
  using (private.is_member(workspace_id));

create policy workspace_members_insert_owner
  on public.workspace_members for insert to authenticated
  with check (private.is_owner(workspace_id));

create policy workspace_members_delete_owner
  on public.workspace_members for delete to authenticated
  using (private.is_owner(workspace_id) and user_id is distinct from (select auth.uid()));

create policy apps_all_member
  on public.apps for all to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id));

create policy export_sets_select_member
  on public.export_sets for select to authenticated
  using (private.is_member(workspace_id));

create policy export_sets_insert_member
  on public.export_sets for insert to authenticated
  with check (
    private.is_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy daily_export_counts_select_member
  on public.daily_export_counts for select to authenticated
  using (private.is_member(workspace_id));

create policy consent_events_own
  on public.consent_events for select to authenticated
  using (user_id = (select auth.uid()));

create policy consent_events_insert_own
  on public.consent_events for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy dsar_requests_own
  on public.dsar_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy dsar_requests_insert_own
  on public.dsar_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

grant execute on function public.increment_daily_export(uuid) to authenticated;
grant execute on function public.erase_current_user() to authenticated;
revoke execute on function public.increment_daily_export(uuid) from anon, public;
revoke execute on function public.erase_current_user() from anon, public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 52428800, array['image/png', 'image/jpeg']::text[]),
  ('exports', 'exports', false, 104857600, array['application/zip']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy uploads_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy uploads_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy uploads_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy uploads_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy exports_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy exports_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy exports_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy exports_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );
