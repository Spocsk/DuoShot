import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { executeExport } from "@/lib/render/export";
import { executeReview } from "@/lib/render/review";
import { NextResponse } from "next/server";
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabase:vi.fn()}));
vi.mock("@/lib/render/export",()=>({executeExport:vi.fn()}));
vi.mock("@/lib/render/review",()=>({executeReview:vi.fn()}));
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();vi.restoreAllMocks();});
describe("private worker access",()=>{
  it("rejects requests without the server secret before accessing the queue",async()=>{
    vi.stubEnv("CRON_SECRET","private");vi.stubEnv("RENDER_QUEUE_ENABLED","true");
    expect((await POST(new Request("http://localhost/api/internal/render-worker",{method:"POST"}))).status).toBe(401);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });
  it("does not claim work until the queue is enabled",async()=>{
    vi.stubEnv("CRON_SECRET","private");vi.stubEnv("RENDER_QUEUE_ENABLED","false");
    expect((await POST(new Request("http://localhost/api/internal/render-worker",{method:"POST",headers:{authorization:"Bearer private"}}))).status).toBe(503);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });
});

const JOB={id:"job-1",user_id:"user-1",workspace_id:"ws-1",kind:"export",payload:{},reservation_id:"res-1",lease_token:"lease-1"};
function worker(job:Record<string,unknown>,complete:{data:unknown;error:unknown}={data:null,error:null}){
  vi.stubEnv("CRON_SECRET","private");vi.stubEnv("RENDER_QUEUE_ENABLED","true");
  const rpc=vi.fn(async(name:string)=>name==="claim_render"?{data:job,error:null}:complete);
  vi.mocked(createAdminSupabase).mockReturnValue({rpc} as never);
  return rpc;
}
const tick=()=>POST(new Request("http://localhost/api/internal/render-worker",{method:"POST",headers:{authorization:"Bearer private"}}));
const completions=(rpc:ReturnType<typeof vi.fn>)=>rpc.mock.calls.filter(([name])=>name==="complete_render");
describe("lost render leases",()=>{
  it("does not complete again when the export reports a lost lease",async()=>{
    const rpc=worker(JOB);vi.spyOn(console,"warn").mockImplementation(()=>{});
    vi.mocked(executeExport).mockResolvedValue(NextResponse.json({error:"RENDER_LEASE_LOST"},{status:409}));
    const response=await tick();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({jobId:"job-1",processed:true,leaseLost:true});
    expect(completions(rpc)).toHaveLength(0);
  });
  it("does not complete again when the review throws a lost lease",async()=>{
    const rpc=worker({...JOB,kind:"review"});vi.spyOn(console,"warn").mockImplementation(()=>{});
    vi.mocked(executeReview).mockRejectedValue(new Error("RENDER_LEASE_LOST"));
    const response=await tick();
    expect(response.status).toBe(200);
    expect((await response.json()).leaseLost).toBe(true);
    expect(completions(rpc)).toHaveLength(0);
  });
  it("records a failure once and stops when that completion finds the lease lost",async()=>{
    const rpc=worker(JOB,{data:null,error:{message:"ERROR: RENDER_LEASE_LOST"}});vi.spyOn(console,"warn").mockImplementation(()=>{});
    vi.mocked(executeExport).mockResolvedValue(NextResponse.json({error:"INPUT_FORMAT"},{status:400}));
    const response=await tick();
    expect(response.status).toBe(200);
    expect((await response.json()).leaseLost).toBe(true);
    expect(completions(rpc)).toHaveLength(1);
    expect(completions(rpc)[0]![1]).toMatchObject({p_job:"job-1",p_lease:"lease-1",p_error:"INPUT_FORMAT"});
  });
  it("still records RENDER_FAILED once for an unexpected crash",async()=>{
    const rpc=worker(JOB);vi.spyOn(console,"error").mockImplementation(()=>{});
    vi.mocked(executeExport).mockRejectedValue(new Error("boom"));
    const response=await tick();
    expect(response.status).toBe(500);
    expect(completions(rpc)).toHaveLength(1);
    expect(completions(rpc)[0]![1]).toMatchObject({p_error:"RENDER_FAILED"});
  });
});
