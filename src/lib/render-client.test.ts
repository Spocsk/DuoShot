import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const id = "10000000-0000-4000-8000-000000000001";
let values: Map<string,string>;
beforeEach(() => {
  vi.resetModules(); values = new Map();
  vi.stubGlobal("localStorage", { getItem: (k:string) => values.get(k) ?? null, setItem: (k:string,v:string) => values.set(k,v), removeItem: (k:string) => values.delete(k) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("render recovery client", () => {
  it("resumes a lost POST with the same key and body", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(Response.json({ jobId:id }, { status:202 }))
      .mockResolvedValueOnce(Response.json({ state:"completed",result:{url:"signed",exportId:id} }));
    vi.stubGlobal("fetch",fetchMock);
    let client = await import("./render-client");
    await expect(client.submitRender("alice","export",{appName:"Original"},vi.fn())).rejects.toThrow("network");
    const original=fetchMock.mock.calls[0][1];
    vi.resetModules();client = await import("./render-client");
    expect(client.resumeRender("bob","export",vi.fn())).toBeNull();
    const result=await client.resumeRender("alice","export",vi.fn());
    expect(await result?.json()).toEqual({url:"signed",exportId:id});
    expect(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]).toBe(original.headers["Idempotency-Key"]);
    expect(fetchMock.mock.calls[1][1].body).toBe(original.body);expect(values.size).toBe(0);
  });
  it("polls a stored job after reload without resubmitting it", async () => {
    vi.useFakeTimers();
    values.set("duoshot:render:alice:export",JSON.stringify({key:id,body:"{}",jobId:id}));
    const progress=vi.fn();
    const fetchMock=vi.fn().mockResolvedValueOnce(Response.json({state:"queued"}))
      .mockResolvedValueOnce(Response.json({state:"running"}))
      .mockResolvedValueOnce(Response.json({state:"completed",result:{url:"fresh"}}));
    vi.stubGlobal("fetch",fetchMock);const client=await import("./render-client");
    const pending=client.resumeRender("alice","export",progress)!;
    await vi.runAllTimersAsync();expect(await (await pending).json()).toEqual({url:"fresh"});
    expect(progress.mock.calls.map(c=>c[0])).toEqual(["queued","running"]);
    expect(fetchMock.mock.calls.every(c=>c[0]===`/api/render-jobs/${id}`)).toBe(true);
  });
  it("preserves the original synchronous API behavior when the queue is disabled", async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({error:"CLONE_RISK"},{status:403})));
    const client=await import("./render-client");const response=await client.submitRender("alice","review",{},vi.fn());
    expect(response.status).toBe(403);expect(values.size).toBe(0);
  });
});
