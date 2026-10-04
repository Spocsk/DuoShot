import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const uid = "00000000-0000-4000-8000-000000000001";
let workspace: string;
beforeAll(async () => {
  // Supabase platform schemas only; application schema and functions are the real migrations.
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());`);
  for (const file of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  await db.query("insert into auth.users values($1,'fixture@example.invalid')", [uid]);
  workspace = (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1", [uid])).rows[0].workspace_id;
}, 30000);
afterAll(() => db.close());

describe("real PostgreSQL migration contracts", () => {
  it("admits only two concurrent free reservations and refunds once", async () => {
    const reserve = () => db.query<{ reserve_export: string }>("select reserve_export($1,$2)", [workspace, uid]);
    const outcomes = await Promise.allSettled([reserve(), reserve(), reserve()]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(outcomes.filter((r) => r.status === "rejected")).toHaveLength(1);
    const successful = outcomes.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof reserve>>>;
    const reservation = successful.value.rows[0].reserve_export;
    await Promise.all([db.query("select finish_export($1,null)", [reservation]), db.query("select finish_export($1,null)", [reservation])]);
    expect((await db.query<{free_exports_used:number}>("select free_exports_used from workspaces where id=$1",[workspace])).rows[0].free_exports_used).toBe(1);
  });
  it("commits export metadata and never refunds a completed export", async () => {
    const reservation = (await db.query<{reserve_export:string}>("select reserve_export($1,$2)",[workspace,uid])).rows[0].reserve_export;
    await db.query("select finish_export($1,$2::jsonb)",[reservation,JSON.stringify({orientation:"portrait",include_69:false,fit_mode:"cover",background_mode:"solid",format:"png",image_count:1,storage_path:`${uid}/fixture.zip`,filename:"fixture.zip"})]);
    await db.query("select finish_export($1,null)",[reservation]);
    expect((await db.query("select id from export_sets where id=$1",[reservation])).rows).toHaveLength(1);
    expect((await db.query<{free_exports_used:number}>("select free_exports_used from workspaces where id=$1",[workspace])).rows[0].free_exports_used).toBe(2);
  });
  it("honors manual Studio and caps concurrent paid exports at 100", async () => {
    await db.query("update workspaces set manual_plan='studio' where id=$1",[workspace]);
    await db.query("insert into daily_export_counts values($1,(now() at time zone 'UTC')::date,99)",[workspace]);
    const outcomes = await Promise.allSettled([db.query("select reserve_export($1,$2)",[workspace,uid]),db.query("select reserve_export($1,$2)",[workspace,uid])]);
    expect(outcomes.filter((r)=>r.status==='fulfilled')).toHaveLength(1);
  });
  it("selects expired files without SQL deletion and blocks account erasure before physical removal", async () => {
    await db.query("insert into storage.objects(bucket_id,name,created_at) values('uploads',$1,now()-interval '25 hours'),('uploads',$2,now()),('reviews','review-old/1.png',now()-interval '8 days')",[`${uid}/old.png`,`${uid}/fresh.png`]);
    await db.query("select private.cleanup_expired_storage()");
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(3);
    expect((await db.query("select * from storage_cleanup_candidates(null)")).rows).toHaveLength(2);
    await expect(db.query("select erase_account($1)",[uid])).rejects.toThrow('STORAGE_NOT_EMPTY');
  });
  it("reserves only two pending Studio seats and validates invite identity and revocation", async () => {
    const member = "22222222-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values($1,'member@example.invalid')", [member]);
    const invite = (email: string, hash: string) => db.query("select create_workspace_invitation($1,$2,$3,$4)", [workspace,uid,email,hash]);
    await Promise.all([invite("member@example.invalid","member-token"), invite("second@example.invalid","second-token")]);
    await expect(invite("fourth@example.invalid","fourth-token")).rejects.toThrow("SEAT_LIMIT");
    await expect(db.query("select accept_workspace_invitation('second-token',$1)",[member])).rejects.toThrow("EMAIL_MISMATCH");
    await db.query("select accept_workspace_invitation('member-token',$1)",[member]);
    expect((await db.query("select * from workspace_members where user_id=$1 and active",[member])).rows).toEqual([expect.objectContaining({workspace_id:workspace,role:"member"})]);
    await expect(db.query("select accept_workspace_invitation('member-token',$1)",[member])).rejects.toThrow("INVITE_EXPIRED");
    await db.query("update workspace_invitations set revoked_at=now() where token_hash='second-token'");
    await expect(db.query("select accept_workspace_invitation('second-token',$1)",[member])).rejects.toThrow("INVITE_EXPIRED");
    await invite("replacement@example.invalid","replacement-token");
    await db.query("update workspace_invitations set expires_at=now()-interval '1 second' where token_hash='replacement-token'");
    await expect(db.query("select accept_workspace_invitation('replacement-token',$1)",[member])).rejects.toThrow("INVITE_EXPIRED");
    await expect(db.query("select create_workspace_invitation($1,$2,'outsider@example.invalid','unauthorized')",[workspace,member])).rejects.toThrow("OWNER_REQUIRED");
  });
  it("reuses a single checkout attempt across concurrent requests and renews only after expiration", async () => {
    type Attempt = {begin_checkout:{attempt_id:string;kind:string}};
    const attempts = await Promise.all([
      db.query<Attempt>("select begin_checkout($1,'indie_monthly','/tool')",[workspace]),
      db.query<Attempt>("select begin_checkout($1,'studio_yearly','/en/tool')",[workspace]),
    ]);
    expect(attempts[0].rows[0].begin_checkout.attempt_id).toBe(attempts[1].rows[0].begin_checkout.attempt_id);
    await db.query("update checkout_attempts set expires_at=now()-interval '1 second' where workspace_id=$1",[workspace]);
    const renewed = await db.query<Attempt>("select begin_checkout($1,'studio_yearly','/tool')",[workspace]);
    expect(renewed.rows[0].begin_checkout.attempt_id).not.toBe(attempts[0].rows[0].begin_checkout.attempt_id);
    expect(renewed.rows[0].begin_checkout.kind).toBe("studio_yearly");
  });
  it("grants signed-in clients no quota, export, membership or public review writes", async () => {
    const privileges = (await db.query<Record<string, boolean>>(`select
      has_function_privilege('authenticated','public.refund_free_export(uuid)','execute') as refund,
      has_function_privilege('authenticated','public.consume_free_export(uuid,integer)','execute') as consume,
      has_function_privilege('authenticated','public.increment_daily_export(uuid)','execute') as increment,
      has_function_privilege('authenticated','public.erase_current_user()','execute') as erase,
      has_table_privilege('authenticated','public.export_sets','insert') as export_insert,
      has_table_privilege('authenticated','public.workspace_members','insert') as member_insert,
      has_table_privilege('authenticated','public.workspace_members','delete') as member_delete`)).rows[0];
    expect(Object.entries(privileges).filter(([, granted]) => granted).map(([name]) => name)).toEqual([]);
    expect((await db.query("select public from storage.buckets where id='reviews'")).rows).toEqual([{ public: false }]);
    expect((await db.query("select policyname from pg_policies where schemaname='storage' and policyname like 'reviews_%'")).rows).toEqual([]);
  });
  it("keeps App Store Connect keys service-role only and erases them with the workspace or the user", async () => {
    const row = (await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='public.asc_connections'::regclass")).rows[0];
    expect(row?.relrowsecurity).toBe(true);
    expect((await db.query("select policyname from pg_policies where tablename='asc_connections'")).rows).toEqual([]);
    const privileges = (await db.query<Record<string, boolean>>(`select
      has_table_privilege('anon','public.asc_connections','select') as anon_select,
      has_table_privilege('authenticated','public.asc_connections','select') as auth_select,
      has_table_privilege('authenticated','public.asc_connections','insert') as auth_insert,
      has_table_privilege('authenticated','public.asc_connections','update') as auth_update,
      has_table_privilege('authenticated','public.asc_connections','delete') as auth_delete,
      has_function_privilege('authenticated','public.report_render_progress(uuid,uuid,jsonb)','execute') as progress`)).rows[0]!;
    expect(Object.entries(privileges).filter(([, granted]) => granted).map(([name]) => name)).toEqual([]);
    expect((await db.query<{ ok: boolean }>("select has_table_privilege('service_role','public.asc_connections','insert') as ok")).rows[0]?.ok).toBe(true);

    const owner = "33333333-0000-4000-8000-000000000003";
    await db.query("insert into auth.users values($1,'asc@example.invalid')", [owner]);
    const ws = (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1", [owner])).rows[0]!.workspace_id;
    const insert = (workspaceId: string) => db.query("insert into asc_connections(workspace_id,issuer_id,key_id,encrypted_private_key,iv,auth_tag,created_by) values($1,'57246542-96fe-1a63-e053-0824d011072a','2X9R4HXF34','c2VhbGVk','aXY=','dGFn',$2)", [workspaceId, owner]);
    await insert(ws);
    await expect(insert(ws)).rejects.toThrow();
    await db.query("delete from workspaces where id=$1", [ws]);
    expect((await db.query("select 1 from asc_connections where created_by=$1", [owner])).rows).toHaveLength(0);
    await insert(workspace);
    await db.query("delete from auth.users where id=$1", [owner]);
    expect((await db.query("select 1 from asc_connections where created_by=$1", [owner])).rows).toHaveLength(0);
  });
  it("queues asc_upload jobs without a quota reservation and records progress only under a live lease", async () => {
    const user = "44444444-0000-4000-8000-000000000004";
    await db.query("insert into auth.users values($1,'queue@example.invalid')", [user]);
    const ws = (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1", [user])).rows[0]!.workspace_id;
    const used = async () => (await db.query<{ free_exports_used: number }>("select free_exports_used from workspaces where id=$1", [ws])).rows[0]!.free_exports_used;
    const before = await used();
    const job = (await db.query<{ enqueue_render: string }>("select enqueue_render($1,$2,'asc_upload',gen_random_uuid(),'{}'::jsonb)", [user, ws])).rows[0]!.enqueue_render;
    expect((await db.query("select reservation_id from render_jobs where id=$1", [job])).rows).toEqual([{ reservation_id: null }]);
    expect(await used()).toBe(before);
    await expect(db.query("select enqueue_render($1,$2,'upload_everything',gen_random_uuid(),'{}'::jsonb)", [user, ws])).rejects.toThrow("INVALID_REQUEST");
    const lease = "55555555-0000-4000-8000-000000000005";
    await db.query("update render_jobs set state='running',lease_token=$2,lease_until=now()+interval '90 seconds' where id=$1", [job, lease]);
    const report = (token: string) => db.query<{ report_render_progress: boolean }>(`select report_render_progress($1,$2,'{"done":1}'::jsonb)`, [job, token]);
    expect((await report("66666666-0000-4000-8000-000000000006")).rows[0]!.report_render_progress).toBe(false);
    expect((await report(lease)).rows[0]!.report_render_progress).toBe(true);
    expect((await db.query("select progress from render_jobs where id=$1", [job])).rows).toEqual([{ progress: { done: 1 } }]);
    await db.query(`select complete_render($1,$2,'{"uploaded":1}'::jsonb)`, [job, lease]);
    expect((await db.query("select state,result from render_jobs where id=$1", [job])).rows).toEqual([{ state: "completed", result: { uploaded: 1 } }]);
  });
});
