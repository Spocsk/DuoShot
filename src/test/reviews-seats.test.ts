import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
beforeAll(async () => {
  // Supabase platform schemas only; application schema and functions are the real migrations.
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as $$ select current_setting('test.uid',true)::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());`);
  for (const file of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
}, 30000);
afterAll(() => db.close());

const tag = () => randomUUID().slice(0, 8);
async function newUser(email: string | null = `${tag()}@example.invalid`) {
  const id = randomUUID();
  await db.query("insert into auth.users values($1,$2)", [id, email]);
  const workspace = (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1", [id])).rows[0].workspace_id;
  return { id, email, workspace };
}
const addMember = (workspace: string, user: string, active = false) =>
  db.query("insert into workspace_members(workspace_id,user_id,role,active) values($1,$2,'member',$3)", [workspace, user, active]);
const activeWorkspace = async (user: string) =>
  (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1 and active", [user])).rows.map((r) => r.workspace_id);

describe("review RPCs on real PostgreSQL", () => {
  async function review(fields: Record<string, unknown> = {}) {
    const owner = await newUser();
    const publicId = `rv${tag()}`;
    const row = (await db.query<{ id: string }>(
      "insert into review_links(public_id,workspace_id,created_by,set_name,client_name,orientation) values($1,$2,$3,'Set','Client','portrait') returning id",
      [publicId, owner.workspace, owner.id],
    )).rows[0];
    for (const [key, value] of Object.entries(fields)) {
      await db.query(`update review_links set ${key}=$1 where id=$2`, [value, row.id]);
    }
    return { id: row.id, publicId };
  }
  type Payload = Record<string, unknown> | null;
  const payload = async (pid: string | null) => (await db.query<{ p: Payload }>("select get_review_payload($1) as p", [pid])).rows[0].p;
  const decide = async (pid: string, status: string | null, comment: string | null = null) =>
    (await db.query<{ r: Record<string, unknown> }>("select submit_review_decision($1,$2,$3) as r", [pid, status, comment])).rows[0].r;

  it.each([null, "", "abc", "  ab  "])("returns null for a missing or too-short id (%j)", async (pid) => {
    expect(await payload(pid)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await payload("does-not-exist")).toBeNull();
  });

  it("returns ordered slides without storage paths", async () => {
    const { id, publicId } = await review();
    await db.query(`insert into review_slides(review_id,slide_index,outer_path,inner_path,clone_label) values
      ($1,2,'p/03-outer.jpg','p/03-inner.jpg','risk'),($1,0,'p/01-outer.jpg','p/01-inner.jpg','ok'),($1,1,'p/02-outer.jpg','p/02-inner.jpg','review')`, [id]);
    const result = await payload(publicId);
    expect(result).toMatchObject({ id, public_id: publicId, set_name: "Set", client_name: "Client", orientation: "portrait", status: "pending", comment: null, revoked_at: null });
    expect(result?.slides).toEqual([
      { slide_index: 0, clone_label: "ok" },
      { slide_index: 1, clone_label: "review" },
      { slide_index: 2, clone_label: "risk" },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/path|workspace_id|created_by/);
  });

  it("returns an empty slide list for a review without slides", async () => {
    const { publicId } = await review();
    expect((await payload(publicId))?.slides).toEqual([]);
  });

  it("returns lifecycle fields for revoked and expired links so the caller can gate them", async () => {
    const revoked = await review({ revoked_at: new Date().toISOString(), status: "revoked" });
    expect(await payload(revoked.publicId)).toMatchObject({ status: "revoked", revoked_at: expect.any(String) });
    const expired = await review({ expires_at: new Date(Date.now() - 1000).toISOString() });
    const result = await payload(expired.publicId);
    expect(result?.status).toBe("pending");
    expect(Date.parse(result?.expires_at as string)).toBeLessThan(Date.now());
  });

  it.each(["revoked", "pending", "expired", "", null])("rejects the status %j", async (status) => {
    const { publicId } = await review();
    expect(await decide(publicId, status)).toEqual({ error: "INVALID_STATUS" });
    expect((await payload(publicId))?.status).toBe("pending");
  });

  it("returns NOT_FOUND for an unknown review", async () => {
    expect(await decide("does-not-exist", "approved")).toEqual({ error: "NOT_FOUND" });
  });

  it.each([
    [{ revoked_at: new Date().toISOString() }, "REVOKED"],
    [{ status: "revoked" }, "REVOKED"],
    [{ expires_at: new Date(Date.now() - 1000).toISOString() }, "EXPIRED"],
    [{ status: "expired" }, "EXPIRED"],
    [{ revoked_at: new Date().toISOString(), expires_at: new Date(Date.now() - 1000).toISOString() }, "REVOKED"],
  ])("refuses decisions on %j with %s and leaves the row untouched", async (fields, error) => {
    const { id, publicId } = await review(fields);
    const before = (await db.query("select status,comment,updated_at from review_links where id=$1", [id])).rows[0];
    expect(await decide(publicId, "approved", "late")).toEqual({ error });
    expect((await db.query("select status,comment,updated_at from review_links where id=$1", [id])).rows[0]).toEqual(before);
  });

  it("records a decision and allows the client to change it while the link is live", async () => {
    const { id, publicId } = await review();
    expect(await decide(publicId, "approved", "Ship it")).toEqual({ ok: true, public_id: publicId, status: "approved", comment: "Ship it" });
    expect((await db.query("select status,comment from review_links where id=$1", [id])).rows[0]).toEqual({ status: "approved", comment: "Ship it" });
    expect(await decide(publicId, "changes_requested")).toMatchObject({ ok: true, status: "changes_requested", comment: null });
    expect((await db.query("select status,comment from review_links where id=$1", [id])).rows[0]).toEqual({ status: "changes_requested", comment: null });
  });

  it.each(["anon", "authenticated"])("does not let %s execute the review RPCs or read review tables", async (role) => {
    const { publicId } = await review();
    const grants = (await db.query<Record<string, boolean>>(`select
      has_function_privilege($1,'public.get_review_payload(text)','execute') as read,
      has_function_privilege($1,'public.submit_review_decision(text,text,text)','execute') as decide`, [role])).rows[0];
    expect(grants).toEqual({ read: false, decide: false });
    await db.exec(`set role ${role}`);
    try {
      await expect(payload(publicId)).rejects.toThrow(/permission denied/);
      await expect(decide(publicId, "approved")).rejects.toThrow(/permission denied/);
      const direct = await db.query("select * from public.review_links").then((r) => r.rows, () => []);
      expect(direct).toEqual([]);
      const slides = await db.query("select * from public.review_slides").then((r) => r.rows, () => []);
      expect(slides).toEqual([]);
    } finally {
      await db.exec("reset role");
    }
    expect((await payload(publicId))?.status).toBe("pending");
  });

  it("keeps both RPCs executable by service_role only", async () => {
    const grants = (await db.query<Record<string, boolean>>(`select
      has_function_privilege('service_role','public.get_review_payload(text)','execute') as read,
      has_function_privilege('service_role','public.submit_review_decision(text,text,text)','execute') as decide`)).rows[0];
    expect(grants).toEqual({ read: true, decide: true });
  });

  it("can re-apply the service-only migration", async () => {
    await db.exec(await readFile("supabase/migrations/20261004120000_review_rpcs_service_only.sql", "utf8"));
    const anon = (await db.query<{ ok: boolean }>("select has_function_privilege('anon','public.get_review_payload(text)','execute') as ok")).rows[0];
    expect(anon.ok).toBe(false);
  });
});

describe("new users and seat limits on real PostgreSQL", () => {
  it("gives every new auth user a free workspace with an active owner seat", async () => {
    const user = await newUser("jane.doe@example.invalid");
    const workspace = (await db.query("select name,slug,plan,seats,manual_plan from workspaces where id=$1", [user.workspace])).rows[0];
    expect(workspace).toEqual({
      name: "jane.doe", slug: `ws-${user.id.replaceAll("-", "").slice(0, 12)}`, plan: "free", seats: 1, manual_plan: null,
    });
    expect((await db.query("select role,active from workspace_members where user_id=$1", [user.id])).rows).toEqual([{ role: "owner", active: true }]);
  });

  it.each([null, "@example.invalid"])("names the workspace 'Workspace' for the email %j", async (email) => {
    const user = await newUser(email);
    expect((await db.query("select name from workspaces where id=$1", [user.workspace])).rows[0]).toEqual({ name: "Workspace" });
  });

  it("allows a single seat on a free workspace", async () => {
    const owner = await newUser();
    const other = await newUser();
    await expect(addMember(owner.workspace, other.id)).rejects.toThrow("SEAT_LIMIT");
  });

  it("does not grant Studio seats from plan='studio' without an active subscription", async () => {
    const owner = await newUser();
    const other = await newUser();
    await db.query("update workspaces set plan='studio' where id=$1", [owner.workspace]);
    await expect(addMember(owner.workspace, other.id)).rejects.toThrow("SEAT_LIMIT");
    await db.query("update workspaces set stripe_subscription_id='sub_x',subscription_status='past_due' where id=$1", [owner.workspace]);
    await expect(addMember(owner.workspace, other.id)).rejects.toThrow("SEAT_LIMIT");
  });

  it.each([
    ["an active subscription", "plan='studio',stripe_subscription_id='sub_'||id,subscription_status='active'"],
    ["a trialing subscription", "plan='studio',stripe_subscription_id='sub_'||id,subscription_status='trialing'"],
    ["a manual grant", "manual_plan='studio'"],
  ])("allows three Studio seats with %s and refuses the fourth", async (_label, assignment) => {
    const owner = await newUser();
    await db.query(`update workspaces set ${assignment} where id=$1`, [owner.workspace]);
    const [a, b, c] = [await newUser(), await newUser(), await newUser()];
    await addMember(owner.workspace, a.id);
    await addMember(owner.workspace, b.id);
    await expect(addMember(owner.workspace, c.id)).rejects.toThrow("SEAT_LIMIT");
    expect((await db.query("select count(*)::int as n from workspace_members where workspace_id=$1", [owner.workspace])).rows[0]).toEqual({ n: 3 });
  });

  it("counts inactive memberships against the seat limit", async () => {
    const owner = await newUser();
    await db.query("update workspaces set manual_plan='studio' where id=$1", [owner.workspace]);
    const [a, b, c] = [await newUser(), await newUser(), await newUser()];
    await addMember(owner.workspace, a.id, false);
    await addMember(owner.workspace, b.id, false);
    await expect(addMember(owner.workspace, c.id)).rejects.toThrow("SEAT_LIMIT");
  });
});

describe("workspace invitations on real PostgreSQL", () => {
  async function studio() {
    const owner = await newUser();
    await db.query("update workspaces set manual_plan='studio' where id=$1", [owner.workspace]);
    return owner;
  }
  const invite = (workspace: string, owner: string, email: string, hash = `tok-${tag()}`) =>
    db.query<{ i: Record<string, unknown> }>("select create_workspace_invitation($1,$2,$3,$4) as i", [workspace, owner, email, hash]).then((r) => ({ ...r.rows[0].i, hash }));
  const accept = (hash: string, user: string) => db.query("select accept_workspace_invitation($1,$2)", [hash, user]);

  it("requires Studio to invite", async () => {
    const owner = await newUser();
    await expect(invite(owner.workspace, owner.id, "x@example.invalid")).rejects.toThrow("STUDIO_REQUIRED");
  });

  it("refuses to invite an existing member, case-insensitively", async () => {
    const owner = await studio();
    await expect(invite(owner.workspace, owner.id, owner.email!.toUpperCase())).rejects.toThrow("ALREADY_MEMBER");
  });

  it("refuses a second live invitation for the same address in any case and stores it lower-cased", async () => {
    const owner = await studio();
    const first = await invite(owner.workspace, owner.id, "Client@Example.invalid");
    expect(first).toMatchObject({ email: "client@example.invalid", role: "member" });
    await expect(invite(owner.workspace, owner.id, "CLIENT@example.INVALID")).rejects.toThrow("INVITE_EXISTS");
  });

  it("accepts an invitation whose address differs only in case and moves the active workspace", async () => {
    const owner = await studio();
    const member = await newUser(`Mixed.${tag()}@Example.invalid`);
    const { hash } = await invite(owner.workspace, owner.id, member.email!.toLowerCase());
    const accepted = (await accept(hash, member.id)).rows[0] as { accept_workspace_invitation: string };
    expect(accepted.accept_workspace_invitation).toBe(owner.workspace);
    expect(await activeWorkspace(member.id)).toEqual([owner.workspace]);
    expect((await db.query("select active from workspace_members where user_id=$1 and workspace_id=$2", [member.id, member.workspace])).rows).toEqual([{ active: false }]);
  });

  it("frees a pending seat when an invitation is revoked or expires", async () => {
    const owner = await studio();
    const a = await invite(owner.workspace, owner.id, `a-${tag()}@example.invalid`);
    const b = await invite(owner.workspace, owner.id, `b-${tag()}@example.invalid`);
    await expect(invite(owner.workspace, owner.id, `c-${tag()}@example.invalid`)).rejects.toThrow("SEAT_LIMIT");
    await db.query("update workspace_invitations set revoked_at=now() where token_hash=$1", [a.hash]);
    await invite(owner.workspace, owner.id, `c-${tag()}@example.invalid`);
    await expect(invite(owner.workspace, owner.id, `d-${tag()}@example.invalid`)).rejects.toThrow("SEAT_LIMIT");
    await db.query("update workspace_invitations set expires_at=now()-interval '1 second' where token_hash=$1", [b.hash]);
    await invite(owner.workspace, owner.id, `d-${tag()}@example.invalid`);
  });

  it("rolls back acceptance when the workspace lost Studio after the invitation", async () => {
    const owner = await studio();
    const member = await newUser();
    const { hash } = await invite(owner.workspace, owner.id, member.email!);
    await db.query("update workspaces set manual_plan=null where id=$1", [owner.workspace]);
    await expect(accept(hash, member.id)).rejects.toThrow("STUDIO_REQUIRED");
    expect((await db.query("select accepted_at from workspace_invitations where token_hash=$1", [hash])).rows).toEqual([{ accepted_at: null }]);
    expect(await activeWorkspace(member.id)).toEqual([member.workspace]);
    expect((await db.query("select 1 from workspace_members where user_id=$1 and workspace_id=$2", [member.id, owner.workspace])).rows).toEqual([]);
  });

  it("rolls back acceptance when seats filled up after the invitation", async () => {
    const owner = await studio();
    const member = await newUser();
    const { hash } = await invite(owner.workspace, owner.id, member.email!);
    await addMember(owner.workspace, (await newUser()).id);
    await addMember(owner.workspace, (await newUser()).id);
    await expect(accept(hash, member.id)).rejects.toThrow("SEAT_LIMIT");
    expect((await db.query("select accepted_at from workspace_invitations where token_hash=$1", [hash])).rows).toEqual([{ accepted_at: null }]);
    expect(await activeWorkspace(member.id)).toEqual([member.workspace]);
  });

  it("returns INVITE_EXPIRED for an unknown token", async () => {
    const member = await newUser();
    await expect(accept("no-such-token", member.id)).rejects.toThrow("INVITE_EXPIRED");
  });

  it("keeps both invitation RPCs off the anon and authenticated roles", async () => {
    const grants = (await db.query<Record<string, boolean>>(`select
      has_function_privilege('anon','public.create_workspace_invitation(uuid,uuid,text,text)','execute') as anon_create,
      has_function_privilege('authenticated','public.create_workspace_invitation(uuid,uuid,text,text)','execute') as auth_create,
      has_function_privilege('anon','public.accept_workspace_invitation(text,uuid)','execute') as anon_accept,
      has_function_privilege('authenticated','public.accept_workspace_invitation(text,uuid)','execute') as auth_accept`)).rows[0];
    expect(Object.values(grants)).toEqual([false, false, false, false]);
  });
});
