-- Count seats and pending invitations under the same workspace lock.
create or replace function private.enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; member_count integer; studio boolean;
begin
  select * into w from public.workspaces where id=new.workspace_id for update;
  studio := w.manual_plan='studio' or (w.plan='studio' and w.stripe_subscription_id is not null and w.subscription_status in ('active','trialing'));
  select count(*) into member_count from public.workspace_members where workspace_id=new.workspace_id;
  if member_count >= (case when studio then 3 else 1 end) then raise exception 'SEAT_LIMIT'; end if;
  return new;
end $$;

create or replace function public.create_workspace_invitation(p_workspace_id uuid,p_user_id uuid,p_email text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; n integer; invitation public.workspace_invitations;
begin
  select * into w from public.workspaces where id=p_workspace_id for update;
  if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id and role='owner' and active) then raise exception 'OWNER_REQUIRED'; end if;
  if not (coalesce(w.manual_plan='studio',false) or coalesce(w.plan='studio' and w.stripe_subscription_id is not null and w.subscription_status in ('active','trialing'),false)) then raise exception 'STUDIO_REQUIRED'; end if;
  if exists(select 1 from public.workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace_id and lower(u.email)=lower(p_email)) then raise exception 'ALREADY_MEMBER'; end if;
  if exists(select 1 from public.workspace_invitations where workspace_id=p_workspace_id and lower(email)=lower(p_email) and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'INVITE_EXISTS'; end if;
  select (select count(*) from public.workspace_members where workspace_id=p_workspace_id) + (select count(*) from public.workspace_invitations where workspace_id=p_workspace_id and accepted_at is null and revoked_at is null and expires_at>now()) into n;
  if n>=3 then raise exception 'SEAT_LIMIT'; end if;
  insert into public.workspace_invitations(workspace_id,email,role,token_hash,invited_by) values(p_workspace_id,lower(p_email),'member',p_token_hash,p_user_id) returning * into invitation;
  return jsonb_build_object('id',invitation.id,'email',invitation.email,'role',invitation.role,'created_at',invitation.created_at,'expires_at',invitation.expires_at);
end $$;

create or replace function public.accept_workspace_invitation(p_token_hash text,p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations; w public.workspaces; user_email text; workspace uuid;
begin
  select email into user_email from auth.users where id=p_user_id for update;
  select workspace_id into workspace from public.workspace_invitations where token_hash=p_token_hash;
  select * into w from public.workspaces where id=workspace for update;
  select * into invitation from public.workspace_invitations where token_hash=p_token_hash for update;
  if not found or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now() then raise exception 'INVITE_EXPIRED'; end if;
  if user_email is null or lower(user_email)<>lower(invitation.email) then raise exception 'EMAIL_MISMATCH'; end if;
  if not (coalesce(w.manual_plan='studio',false) or coalesce(w.plan='studio' and w.stripe_subscription_id is not null and w.subscription_status in ('active','trialing'),false)) then raise exception 'STUDIO_REQUIRED'; end if;
  -- Never overwrite a pre-existing owner role. Everything rolls back if a seat cannot be added.
  if not exists(select 1 from public.workspace_members where workspace_id=workspace and user_id=p_user_id) then
    insert into public.workspace_members(workspace_id,user_id,role,active) values(workspace,p_user_id,'member',false);
  end if;
  update public.workspace_members set active=false where user_id=p_user_id and active;
  update public.workspace_members set active=true where user_id=p_user_id and workspace_id=workspace;
  update public.workspace_invitations set accepted_at=now() where id=invitation.id;
  return workspace;
end $$;
revoke all on function public.create_workspace_invitation(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.accept_workspace_invitation(text,uuid) from public,anon,authenticated;
grant execute on function public.create_workspace_invitation(uuid,uuid,text,text) to service_role;
grant execute on function public.accept_workspace_invitation(text,uuid) to service_role;
