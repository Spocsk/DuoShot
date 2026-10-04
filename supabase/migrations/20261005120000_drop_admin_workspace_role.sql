-- The 'admin' workspace role was never assigned: signup creates the 'owner',
-- invitations only create 'member' rows. Drop it from the check constraint so
-- the application reasons about two roles only.
--
-- One DO block, so the check and the constraint swap are atomic even when the
-- file is applied without ON_ERROR_STOP: a remaining admin row aborts the whole
-- migration instead of silently changing anyone's permissions.
do $$
declare
  admins integer;
begin
  select count(*) into admins from public.workspace_members where role = 'admin';
  if admins > 0 then
    raise exception 'workspace_members has % row(s) with role admin: reassign them to owner or member before applying this migration', admins;
  end if;
  alter table public.workspace_members drop constraint workspace_members_role_check;
  alter table public.workspace_members
    add constraint workspace_members_role_check check (role in ('owner', 'member'));
end $$;
