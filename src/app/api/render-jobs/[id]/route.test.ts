import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createServerSupabase } from "@/lib/supabase/server";
vi.mock("@/lib/supabase/server",()=>({createServerSupabase:vi.fn()}));
afterEach(()=>vi.clearAllMocks());
const id="10000000-0000-4000-8000-000000000001";
describe("private render status",()=>{
 it("rejects unverifiable claims before querying job data",async()=>{
  const from=vi.fn();vi.mocked(createServerSupabase).mockResolvedValue({auth:{getClaims:async()=>({data:null,error:new Error("invalid signature")})},from} as never);
  expect((await GET(new Request("http://localhost"),{params:Promise.resolve({id})})).status).toBe(401);
  expect(from).not.toHaveBeenCalled();
 });
 it("filters status by the verified user and masks missing or foreign jobs",async()=>{
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:async()=>({data:null,error:null})};
  vi.mocked(createServerSupabase).mockResolvedValue({auth:{getClaims:async()=>({data:{claims:{sub:"owner"}},error:null})},from:()=>query} as never);
  const response=await GET(new Request("http://localhost"),{params:Promise.resolve({id})});
  expect(response.status).toBe(404);expect(query.eq).toHaveBeenCalledWith("user_id","owner");
 });
});
