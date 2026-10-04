-- "Prévenez-moi" double opt-in list. Not linked to accounts. Only the server
-- (service role) reads or writes it; RLS is enabled with no policies.
-- token is a random capability used in the confirmation and unsubscribe links;
-- it is kept after confirmation so later notices can carry an unsubscribe link.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null check (topic in ('apple_duo_open', 'launch')),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  token text not null unique check (char_length(token) between 32 and 128),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, topic)
);
alter table public.waitlist enable row level security;
revoke all on public.waitlist from public, anon, authenticated;
grant all on public.waitlist to service_role;
