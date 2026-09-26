import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createAdminSupabase } from "@/lib/supabase/admin";
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabase:vi.fn()}));
vi.mock("@/lib/render/export",()=>({executeExport:vi.fn()}));
vi.mock("@/lib/render/review",()=>({executeReview:vi.fn()}));
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
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
