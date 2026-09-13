-- Public RPC wrappers must be SECURITY DEFINER: schema `private` has no USAGE
-- for authenticated, so invoker wrappers fail with "permission denied for schema private"
-- and the export API mapped that 403 to TRIAL_EXHAUSTED.

create or replace function public.consume_free_export(p_workspace_id uuid, p_limit integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.consume_free_export(p_workspace_id, p_limit);
$$;

create or replace function public.refund_free_export(p_workspace_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.refund_free_export(p_workspace_id);
$$;

create or replace function public.increment_daily_export(p_workspace_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.increment_daily_export(p_workspace_id);
$$;

create or replace function public.erase_current_user()
returns void
language sql
security definer
set search_path = public
as $$
  select private.erase_current_user();
$$;

grant execute on function public.consume_free_export(uuid, integer) to authenticated;
grant execute on function public.refund_free_export(uuid) to authenticated;
grant execute on function public.increment_daily_export(uuid) to authenticated;
grant execute on function public.erase_current_user() to authenticated;

revoke execute on function public.consume_free_export(uuid, integer) from anon, public;
revoke execute on function public.refund_free_export(uuid) from anon, public;
revoke execute on function public.increment_daily_export(uuid) from anon, public;
revoke execute on function public.erase_current_user() from anon, public;

revoke execute on function private.consume_free_export(uuid, integer) from public, anon, authenticated;
revoke execute on function private.refund_free_export(uuid) from public, anon, authenticated;
revoke execute on function private.increment_daily_export(uuid) from public, anon, authenticated;
revoke execute on function private.erase_current_user() from public, anon, authenticated;
