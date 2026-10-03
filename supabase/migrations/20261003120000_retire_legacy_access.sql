-- Folds supabase/cutover/20260925_retire_legacy_rpc.sql into the migration chain so a
-- database rebuilt from migrations matches production. Every statement is idempotent;
-- production already had the cutover applied (verified 2026-10-03).

-- Quota and export writes go through service-role RPCs only.
revoke execute on function public.refund_free_export(uuid) from authenticated;
revoke execute on function public.consume_free_export(uuid,integer) from authenticated;
revoke execute on function public.increment_daily_export(uuid) from authenticated;
revoke insert on public.export_sets from authenticated;
revoke execute on function public.erase_current_user() from public,anon,authenticated;

-- Review media is served only by the lifecycle-checked server endpoint.
update storage.buckets set public=false where id='reviews';
drop policy if exists reviews_select_public on storage.objects;
drop policy if exists reviews_insert_member on storage.objects;
drop policy if exists reviews_update_member on storage.objects;
drop policy if exists reviews_delete_member on storage.objects;

-- Membership changes go through invitations and the service-role API, never PostgREST:
-- an owner could otherwise add any user, bypassing consent and the Studio seat limit.
revoke insert, delete on public.workspace_members from authenticated;
drop policy if exists workspace_members_insert_owner on public.workspace_members;
drop policy if exists workspace_members_delete_owner on public.workspace_members;
