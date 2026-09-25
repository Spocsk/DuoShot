import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder } from "@/test/supabase-mock";
import { GET } from "./route";
vi.mock("@/lib/supabase/server",()=>({createServerSupabase:vi.fn()}));
const params={params:Promise.resolve({id:"export-1"})};
const request=new Request("https://duoshot.site/api/exports/export-1/download?format=json");
const sign=vi.fn(); const rpc=vi.fn();
function setup(age=1000, signError: unknown=null) {
 sign.mockResolvedValue({data:signError?null:{signedUrl:"https://storage.example/fresh.zip"},error:signError});
 vi.mocked(createServerSupabase).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1"}}})},rpc,
 from:()=>createQueryBuilder({data:{storage_path:"user-1/zip",created_by:"user-1",created_at:new Date(Date.now()-age).toISOString(),filename:"app.zip"}}),
 storage:{from:()=>({createSignedUrl:sign})}} as never);
}
beforeEach(()=>{sign.mockReset();rpc.mockReset();});
describe("download recovery",()=>{
 it("renews an expired link without reserving quota",async()=>{setup(); const res=await GET(request,params); expect(res.status).toBe(200); expect((await res.json()).url).toContain("fresh.zip");expect(rpc).not.toHaveBeenCalled();});
 it("redirects the normal download to Storage",async()=>{setup();const res=await GET(new Request("https://duoshot.site/api/exports/export-1/download"),params); expect(res.status).toBe(303);expect(res.headers.get("location")).toBe("https://storage.example/fresh.zip");});
 it("rejects the file after its retention window",async()=>{setup(86400001); const res=await GET(request,params);expect(res.status).toBe(410);expect((await res.json()).error).toBe("EXPORT_EXPIRED");expect(sign).not.toHaveBeenCalled();});
 it("distinguishes deleted files from temporary Storage failures",async()=>{setup(1000,{message:"Object not found"});expect((await (await GET(request,params)).json()).error).toBe("EXPORT_DELETED");setup(1000,{message:"Network error"});expect((await GET(request,params)).status).toBe(503);});
});
