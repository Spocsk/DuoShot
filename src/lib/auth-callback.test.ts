import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerSupabase } from "./supabase/server";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";
vi.mock("./supabase/server", () => ({ createServerSupabase: vi.fn() }));
const exchange = vi.fn(); const verify = vi.fn();
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
  exchange.mockReset().mockResolvedValue({ data: { session: { user: { id: "u" } } }, error: null });
  verify.mockReset().mockResolvedValue({ data: { session: { user: { id: "u" } } }, error: null });
  vi.mocked(createServerSupabase).mockReset().mockResolvedValue({ auth: { exchangeCodeForSession: exchange, verifyOtp: verify } } as never);
});
afterEach(() => vi.unstubAllEnvs());
const req = (path: string, params: Record<string,string>) => new Request(`http://127.0.0.1:3000/auth/${path}?${new URLSearchParams(params)}`, { headers: { "x-forwarded-host": "evil.test" } });
describe("auth callbacks", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/\tevil.test", "javascript:alert(1)"])("rejects external or malformed next %s", async (next) => {
    const result = await callback(req("callback", { code: "valid", next }));
    expect(result.headers.get("location")).toBe("https://duoshot.site/tool");
  });
  it("keeps internal localized paths and uses the public origin behind a proxy", async () => {
    const response = await callback(req("callback", { code: "valid", next: "/en/tool?upgrade=1" }));
    expect(response.headers.get("location")).toBe("https://duoshot.site/en/tool?upgrade=1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it.each(["missing", "expired", "throw", "no-session", "provider-error"])("shows a safe failure for %s", async (kind) => {
    if(kind==="expired") exchange.mockResolvedValue({data:{session:null},error:{message:"sensitive-provider-info"}});
    if(kind==="throw") exchange.mockRejectedValue(new Error("secret"));
    if(kind==="no-session") exchange.mockResolvedValue({data:{session:null},error:null});
    const params: Record<string,string> = {next:"/en/tool"};
    if(kind!=="missing") params.code="used-code";
    if(kind==="provider-error") params.error="access_denied";
    expect((await callback(req("callback",params))).headers.get("location")).toBe("https://duoshot.site/en/login?auth_error=invalid_link");
  });
  it("rejects expired or reused email tokens", async () => {
    verify.mockResolvedValue({data:{session:null},error:{message:"expired"}});
    expect((await confirm(req("confirm",{token_hash:"used",type:"signup"}))).headers.get("location")).toBe("https://duoshot.site/login?auth_error=invalid_link");
  });
  it("rejects unrecognized OTP types without calling Auth", async () => {
    expect((await confirm(req("confirm",{token_hash:"token",type:"sms"}))).headers.get("location")).toContain("auth_error=invalid_link");
    expect(verify).not.toHaveBeenCalled();
  });
  it("routes a verified recovery token to password recovery", async () => {
    expect((await confirm(req("confirm",{token_hash:"token",type:"recovery",next:"/en/tool"}))).headers.get("location")).toBe("https://duoshot.site/en/reset-password");
  });
});
