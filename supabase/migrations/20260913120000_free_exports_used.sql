-- Lifetime free-export counter (2 HD ZIPs), atomic consume/refund.

alter table public.workspaces
  add column if not exists free_exports_used integer not null default 0
    check (free_exports_used >= 0);

create or replace function private.consume_free_export(p_workspace_id uuid, p_limit integer)
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
  if p_limit < 1 then
    raise exception 'invalid limit';
  end if;

  update public.workspaces
  set free_exports_used = free_exports_used + 1
  where id = p_workspace_id
    and free_exports_used < p_limit
  returning free_exports_used into new_count;

  if new_count is null then
    return -1;
  end if;
  return new_count;
end;
$$;

create or replace function public.consume_free_export(p_workspace_id uuid, p_limit integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.consume_free_export(p_workspace_id, p_limit);
$$;

create or replace function private.refund_free_export(p_workspace_id uuid)
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

  update public.workspaces
  set free_exports_used = greatest(free_exports_used - 1, 0)
  where id = p_workspace_id
  returning free_exports_used into new_count;

  return coalesce(new_count, 0);
end;
$$;

create or replace function public.refund_free_export(p_workspace_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.refund_free_export(p_workspace_id);
$$;

grant execute on function public.consume_free_export(uuid, integer) to authenticated;
grant execute on function public.refund_free_export(uuid) to authenticated;
revoke execute on function public.consume_free_export(uuid, integer) from anon, public;
revoke execute on function public.refund_free_export(uuid) from anon, public;
