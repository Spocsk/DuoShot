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
});

describe("one-time pass and waitlist contracts", () => {
  const owner = "33333333-0000-4000-8000-000000000003";
  let passWorkspace: string;
  beforeAll(async () => {
    await db.query("insert into auth.users values($1,'pass@example.invalid')", [owner]);
    passWorkspace = (await db.query<{ workspace_id: string }>("select workspace_id from workspace_members where user_id=$1", [owner])).rows[0].workspace_id;
    await db.query("update workspaces set stripe_customer_id='cus_pass', free_exports_used=2 where id=$1", [passWorkspace]);
  });
  type Grant = { grant_workspace_pass: { granted: boolean; expires_at: string } };
  const grant = (session: string, customer = "cus_pass") =>
    db.query<Grant>("select grant_workspace_pass($1,$2,$3,30)", [passWorkspace, session, customer]);

  it("treats an exhausted trial as free until a pass is granted", async () => {
    await expect(db.query("select reserve_export($1,$2)", [passWorkspace, owner])).rejects.toThrow("TRIAL_EXHAUSTED");
    const first = (await grant("cs_pass_1")).rows[0].grant_workspace_pass;
    expect(first.granted).toBe(true);
    const id = (await db.query<{ reserve_export: string }>("select reserve_export($1,$2)", [passWorkspace, owner])).rows[0].reserve_export;
    expect((await db.query<{ kind: string }>("select kind from export_reservations where id=$1", [id])).rows[0].kind).toBe("daily");
  });
  it("grants each Checkout session once, even under concurrent deliveries", async () => {
    const before = (await db.query<{ n: number }>("select count(*)::int n from workspace_passes where workspace_id=$1", [passWorkspace])).rows[0].n;
    const results = await Promise.all([grant("cs_pass_2"), grant("cs_pass_2")]);
    expect(results.map((r) => r.rows[0].grant_workspace_pass.granted).sort()).toEqual([false, true]);
    expect((await db.query<{ n: number }>("select count(*)::int n from workspace_passes where workspace_id=$1", [passWorkspace])).rows[0].n).toBe(before + 1);
    const days = (await db.query<{ d: number }>("select round(extract(epoch from pass_expires_at-now())/86400)::int d from workspaces where id=$1", [passWorkspace])).rows[0].d;
    expect(days).toBe(60);
  });
  it("releases the completed pass Checkout attempt so a new purchase can start", async () => {
    type Attempt = { begin_checkout: { attempt_id: string } };
    const first = (await db.query<Attempt>("select begin_checkout($1,'pass30','/tool')", [passWorkspace])).rows[0].begin_checkout.attempt_id;
    await db.query("update checkout_attempts set session_id='cs_pass_3' where workspace_id=$1", [passWorkspace]);
    await grant("cs_pass_3");
    const next = (await db.query<Attempt>("select begin_checkout($1,'indie_monthly','/tool')", [passWorkspace])).rows[0].begin_checkout.attempt_id;
    expect(next).not.toBe(first);
  });
  it("rejects a session for another customer and stops counting an expired pass", async () => {
    await expect(grant("cs_pass_other", "cus_other")).rejects.toThrow("CUSTOMER_MISMATCH");
    await db.query("update workspaces set pass_expires_at=now()-interval '1 second' where id=$1", [passWorkspace]);
    await expect(db.query("select reserve_export($1,$2)", [passWorkspace, owner])).rejects.toThrow("TRIAL_EXHAUSTED");
  });
  it("keeps passes, the pass RPC and the waitlist away from client roles", async () => {
    const privileges = (await db.query<Record<string, boolean>>(`select
      has_table_privilege('authenticated','public.workspace_passes','select') as passes_read,
      has_table_privilege('anon','public.waitlist','select') as waitlist_anon_read,
      has_table_privilege('anon','public.waitlist','insert') as waitlist_anon_insert,
      has_table_privilege('authenticated','public.waitlist','select') as waitlist_read,
      has_column_privilege('authenticated','public.workspaces','pass_expires_at','update') as pass_write,
      has_function_privilege('authenticated','public.grant_workspace_pass(uuid,text,text,integer)','execute') as grant_pass,
      has_function_privilege('anon','public.grant_workspace_pass(uuid,text,text,integer)','execute') as grant_pass_anon`)).rows[0];
    expect(Object.entries(privileges).filter(([, granted]) => granted).map(([name]) => name)).toEqual([]);
    expect((await db.query<{ rls: boolean }>("select relrowsecurity rls from pg_class where relname in ('waitlist','workspace_passes')")).rows).toEqual([{ rls: true }, { rls: true }]);
    expect((await db.query("select policyname from pg_policies where tablename in ('waitlist','workspace_passes')")).rows).toEqual([]);
  });
  it("keeps one waitlist row per email and topic", async () => {
    const insert = (topic: string) => db.query("insert into waitlist(email,topic,token) values('dev@example.invalid',$1,$2)", [topic, `${topic}-token-0123456789abcdef0123456789`]);
    await insert("apple_duo_open");
    await insert("launch");
    await expect(db.query("insert into waitlist(email,topic,token) values('dev@example.invalid','launch','another-token-0123456789abcdef0123456789')")).rejects.toThrow();
    await expect(db.query("insert into waitlist(email,topic,token) values('x@example.invalid','newsletter','third-token-0123456789abcdef0123456789')")).rejects.toThrow();
  });
});
