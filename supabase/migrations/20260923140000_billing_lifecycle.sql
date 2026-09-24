-- Keep explicit grants separate from Stripe-backed access.
alter table public.workspaces add column if not exists manual_plan text
  check (manual_plan in ('indie', 'studio'));
alter table public.workspaces add column if not exists stripe_price_id text;
alter table public.workspaces add column if not exists subscription_period_end timestamptz;
alter table public.workspaces add column if not exists subscription_cancel_at_period_end boolean not null default false;

update public.workspaces
set manual_plan = plan
where plan in ('indie', 'studio')
  and stripe_subscription_id is null
  and manual_plan is null;

create unique index if not exists workspaces_stripe_customer_unique
  on public.workspaces (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists workspaces_stripe_subscription_unique
  on public.workspaces (stripe_subscription_id) where stripe_subscription_id is not null;

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;
grant all on public.stripe_events to service_role;
