alter table public.consent_events drop constraint consent_events_kind_check;
alter table public.consent_events add constraint consent_events_kind_check
  check (kind in ('privacy', 'age_16', 'terms', 'analytics'));

create index consent_events_analytics_latest_idx
  on public.consent_events (user_id, created_at desc)
  where kind = 'analytics';
