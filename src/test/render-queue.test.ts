import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const db = new PGlite();
let uid: string, workspace: string;
type Job = { id: string; lease_token: string; reservation_id: string; attempts: number; state: string };
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as $$ select current_setting('test.uid',true)::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());`);
  for (const file of (await readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec("delete from public.render_jobs");
  uid = randomUUID();
  await db.query("insert into auth.users values($1,'queue@example.invalid')", [uid]);
  workspace = (await db.query<{workspace_id:string}>("select workspace_id from workspace_members where user_id=$1", [uid])).rows[0].workspace_id;
});
afterAll(() => db.close());
const body = { outerPaths: [], innerPaths: [] };
const enqueue = async (key = randomUUID(), payload: unknown = body, kind = "export") => (await db.query<{id:string}>("select enqueue_render($1,$2,$3,$4,$5::jsonb) as id", [uid,workspace,kind,key,JSON.stringify(payload)])).rows[0].id;
const claim = async () => (await db.query<{job:Job|null}>("select claim_render() as job")).rows[0].job;
const used = async () => (await db.query<{n:number}>("select free_exports_used as n from workspaces where id=$1", [workspace])).rows[0].n;
const fail = (job:Job) => db.query("select complete_render($1,$2,null,null,'INPUT_FORMAT')", [job.id, job.lease_token]);
describe("durable render queue on real PostgreSQL", () => {
  it("deduplicates concurrent admission and charges one trial", async () => {
    const key = randomUUID();
    const ids = await Promise.all([enqueue(key),enqueue(key)]);
    expect(ids[0]).toBe(ids[1]); expect(await used()).toBe(1);
    await expect(enqueue(key,{changed:true})).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    await expect(enqueue()).rejects.toThrow("RENDER_ALREADY_PENDING");
    expect(await used()).toBe(1);
  });
  it("leases only one render globally and commits export/result/quota atomically", async () => {
    await enqueue();
    const [a,b] = await Promise.all([claim(),claim()]);
    expect([a,b].filter(Boolean)).toHaveLength(1);
    const job = (a ?? b)!;
    const exported={orientation:"portrait",include_69:false,fit_mode:"cover",background_mode:"solid",format:"png",image_count:1,storage_path:`${uid}/queue.zip`,filename:"queue.zip"};
    await db.query("select complete_render($1,$2,$3::jsonb,$4::jsonb)",[job.id,job.lease_token,JSON.stringify({exportId:job.reservation_id,url:"signed-secret",expiresAt:"old"}),JSON.stringify(exported)]);
    const result=(await db.query<{state:string;result:unknown}>("select state,result from render_jobs where id=$1",[job.id])).rows[0];
    expect(result).toEqual({state:"completed",result:{exportId:job.reservation_id}});
    expect((await db.query("select id from export_sets where id=$1",[job.reservation_id])).rows).toHaveLength(1);
    await expect(fail(job)).rejects.toThrow("RENDER_LEASE_LOST"); expect(await used()).toBe(1);
  });
  it("reclaims crashed attempts and fences stale commits and refunds", async () => {
    await enqueue();const old=(await claim())!;
    await db.query("update render_jobs set lease_until=now()-interval '1 second' where id=$1",[old.id]);
    const fresh=(await claim())!;expect(fresh.id).toBe(old.id);expect(fresh.lease_token).not.toBe(old.lease_token);expect(fresh.attempts).toBe(2);
    await expect(fail(old)).rejects.toThrow("RENDER_LEASE_LOST");
    expect((await db.query<{ok:boolean}>("select heartbeat_render($1,$2) as ok",[old.id,old.lease_token])).rows[0].ok).toBe(false);
    await fail(fresh);expect(await used()).toBe(0);
    await expect(fail(fresh)).rejects.toThrow("RENDER_LEASE_LOST");expect(await used()).toBe(0);
  });
  it("protects waiting reservations from the old janitor and expires abandoned queues", async () => {
    const id=await enqueue();
    await db.query("update export_reservations set created_at=now()-interval '15 minutes' where id=(select reservation_id from render_jobs where id=$1)",[id]);
    await db.query("select refund_abandoned_exports()");expect(await used()).toBe(1);
    await db.query("update render_jobs set created_at=now()-interval '31 minutes' where id=$1",[id]);
    expect(await claim()).toBeNull();expect(await used()).toBe(0);
    expect((await db.query<{state:string}>("select state from render_jobs where id=$1",[id])).rows[0].state).toBe("failed");
  });
  it("stops after three crashed attempts and refunds once", async () => {
    const id=await enqueue();
    for(let i=0;i<3;i++){expect((await claim())?.attempts).toBe(i+1);await db.query("update render_jobs set lease_until=now()-interval '1 second' where id=$1",[id]);}
    expect(await claim()).toBeNull();expect(await used()).toBe(0);await claim();expect(await used()).toBe(0);
  });
  it("keeps review recovery URLs and does not consume export quotas", async () => {
    await enqueue(randomUUID(),body,"review");const job=(await claim())!;
    expect(job.reservation_id).toBeNull();expect(await used()).toBe(0);
    const result={id:"review-test",url:"/r/review-test",expiresAt:"2026-10-01"};
    await db.query("select complete_render($1,$2,$3::jsonb)",[job.id,job.lease_token,JSON.stringify(result)]);
    expect((await db.query<{result:unknown}>("select result from render_jobs where id=$1",[job.id])).rows[0].result).toEqual(result);
  });
  it("allows users to read only their own status and denies queue mutations", async () => {
    const id=await enqueue();
    await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec("set role authenticated");
    expect((await db.query("select id from public.render_jobs where id=$1",[id])).rows).toHaveLength(1);
    await expect(db.query("select claim_render()")).rejects.toThrow("permission denied");
    await expect(db.query("delete from render_jobs")).rejects.toThrow("permission denied");
    await db.exec("reset role");await db.query("select set_config('test.uid',$1,false)",[randomUUID()]);await db.exec("set role authenticated");
    expect((await db.query("select id from public.render_jobs")).rows).toHaveLength(0);await db.exec("reset role");
  });
});
