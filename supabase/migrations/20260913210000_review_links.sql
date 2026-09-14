-- DuoShot v1.1 review links + per-app client/orientation.
alter table public.apps add column if not exists client_name text;
alter table public.apps add column if not exists orientation text not null default 'portrait';

create table if not exists public.review_links (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  app_id uuid references public.apps(id) on delete set null,
  set_name text not null,
  client_name text,
  orientation text not null check (orientation in ('portrait', 'landscape')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  comment text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_slides (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.review_links(id) on delete cascade,
  slide_index integer not null,
  outer_path text not null,
  inner_path text not null,
  clone_label text not null check (clone_label in ('ok', 'review', 'risk')),
  unique (review_id, slide_index)
);

create index if not exists review_links_workspace_id_idx on public.review_links (workspace_id);
create index if not exists review_links_public_id_idx on public.review_links (public_id);
create index if not exists review_slides_review_id_idx on public.review_slides (review_id);

alter table public.review_links enable row level security;
alter table public.review_slides enable row level security;
