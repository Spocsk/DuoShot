-- Gated "call7d" 7-day Pro trial. An admin issues a single-use token after a call and
-- emails its link; only the sha256 hex of the token is stored here, never the token.
-- claim_call_trial binds the token to one workspace and one Stripe customer, enforcing
-- one trial per account and per customer (also by unique partial indexes). The table is
-- service-role only; there is no public button and no client access.
create table if not exists public.call_trial_tokens (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  session_id text
);
-- One claimed trial per workspace and per Stripe customer (unclaimed rows stay null).
create unique index if not exists call_trial_tokens_workspace_idx on public.call_trial_tokens(workspace_id) where workspace_id is not null;
create unique index if not exists call_trial_tokens_customer_idx on public.call_trial_tokens(stripe_customer_id) where stripe_customer_id is not null;
alter table public.call_trial_tokens enable row level security;
revoke all on public.call_trial_tokens from public, anon, authenticated;
grant all on public.call_trial_tokens to service_role;

-- Claims the token for a workspace and customer. Idempotent for the same workspace and
-- customer so a lost response can retry and reuse the saved Checkout session.
create or replace function public.claim_call_trial(p_token_hash text, p_workspace_id uuid, p_customer_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.call_trial_tokens;
begin
  select * into t from public.call_trial_tokens where token_hash = p_token_hash for update;
  -- Missing or expired links are indistinguishable to the caller.
  if not found or t.expires_at <= now() then raise exception 'TRIAL_TOKEN_INVALID'; end if;
  if t.used_at is not null then
    -- Same workspace and customer: a retry returns the row unchanged.
    if t.workspace_id = p_workspace_id and t.stripe_customer_id is not distinct from p_customer_id then
      return to_jsonb(t);
    end if;
    -- Claimed by another account: the link is spent for this caller.
    raise exception 'TRIAL_TOKEN_INVALID';
  end if;
  -- One trial ever per workspace or per Stripe customer, across every token.
  if exists (select 1 from public.call_trial_tokens
    where used_at is not null and (workspace_id = p_workspace_id or stripe_customer_id = p_customer_id)) then
    raise exception 'TRIAL_ALREADY_USED';
  end if;
  update public.call_trial_tokens
    set used_at = now(), workspace_id = p_workspace_id, stripe_customer_id = p_customer_id
    where token_hash = p_token_hash returning * into t;
  return to_jsonb(t);
end $$;
revoke all on function public.claim_call_trial(text, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_call_trial(text, uuid, text) to service_role;

-- Remembers the Checkout session opened for a claimed token so a retry reuses it.
create or replace function public.save_call_trial_session(p_token_hash text, p_session_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.call_trial_tokens set session_id = p_session_id where token_hash = p_token_hash;
end $$;
revoke all on function public.save_call_trial_session(text, text) from public, anon, authenticated;
grant execute on function public.save_call_trial_session(text, text) to service_role;
