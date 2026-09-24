create table public.analytics_erasure_jobs (
  distinct_id text primary key,
  tracking_id text,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'done')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analytics_erasure_jobs enable row level security;
revoke all on public.analytics_erasure_jobs from public, anon, authenticated;
grant all on public.analytics_erasure_jobs to service_role;
