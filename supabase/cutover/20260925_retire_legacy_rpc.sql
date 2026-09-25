-- Apply ONLY after the compatible server deployment is verified.
-- Not an additive migration: old deployments require these RPCs.
-- Previous public refund endpoints allowed clients to replenish their own quota.
revoke execute on function public.refund_free_export(uuid) from authenticated;
revoke execute on function public.consume_free_export(uuid,integer) from authenticated;
revoke execute on function public.increment_daily_export(uuid) from authenticated;
revoke insert on public.export_sets from authenticated;
revoke execute on function public.erase_current_user() from public,anon,authenticated;

-- Review media is now served only by the lifecycle-checked server endpoint.
update storage.buckets set public=false where id='reviews';
drop policy if exists reviews_select_public on storage.objects;
drop policy if exists reviews_insert_member on storage.objects;
drop policy if exists reviews_update_member on storage.objects;
drop policy if exists reviews_delete_member on storage.objects;
