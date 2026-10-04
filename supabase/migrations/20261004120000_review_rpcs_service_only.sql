-- The public review RPCs were callable with the publishable key straight through
-- PostgREST (/rest/v1/rpc/...), which bypassed the app's per-IP rate limits.
-- The /api/reviews/[id] routes now require the service-role client, so the
-- functions are restricted to service_role. Supabase default privileges grant
-- EXECUTE directly to anon and authenticated, so both are revoked explicitly
-- in addition to PUBLIC. Safe to re-run.
do $$
begin
  if to_regprocedure('public.get_review_payload(text)') is not null then
    revoke all on function public.get_review_payload(text) from public, anon, authenticated;
    grant execute on function public.get_review_payload(text) to service_role;
  end if;

  if to_regprocedure('public.submit_review_decision(text, text, text)') is not null then
    revoke all on function public.submit_review_decision(text, text, text) from public, anon, authenticated;
    grant execute on function public.submit_review_decision(text, text, text) to service_role;
  end if;
end
$$;
