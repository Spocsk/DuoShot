-- Anonymous aggregates only: no event rows, visitor IDs or request metadata.
create table public.daily_page_views (
  date date not null,
  path text not null check (char_length(path) between 1 and 256),
  utm_source text not null default '' check (char_length(utm_source) <= 64),
  utm_medium text not null default '' check (char_length(utm_medium) <= 64),
  utm_campaign text not null default '' check (char_length(utm_campaign) <= 64),
  count bigint not null default 1 check (count > 0),
  primary key (date, path, utm_source, utm_medium, utm_campaign)
);
alter table public.daily_page_views enable row level security;
revoke all on public.daily_page_views from public, anon, authenticated;
grant all on public.daily_page_views to service_role;

-- A single statement prevents lost increments under concurrent requests.
create function public.increment_daily_page_view(
  p_date date, p_path text, p_utm_source text, p_utm_medium text, p_utm_campaign text
) returns void language sql security definer set search_path='' as $$
  insert into public.daily_page_views (date, path, utm_source, utm_medium, utm_campaign)
  values (p_date, p_path, p_utm_source, p_utm_medium, p_utm_campaign)
  on conflict (date, path, utm_source, utm_medium, utm_campaign)
  do update set count = public.daily_page_views.count + 1;
$$;
revoke all on function public.increment_daily_page_view(date,text,text,text,text) from public, anon, authenticated;
grant execute on function public.increment_daily_page_view(date,text,text,text,text) to service_role;
