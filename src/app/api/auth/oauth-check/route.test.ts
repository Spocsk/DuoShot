import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { readJson } from "@/test/supabase-mock";
import { POST } from "./route";

function jsonRequest(body: unknown, host?: string) {
  return new Request("http://localhost/api/auth/oauth-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(host ? { "x-forwarded-host": host } : {}),
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/oauth-check", () => {
  it("rejects an invalid URL", async () => {
    const { status, body } = await readJson(await POST(jsonRequest({ url: "not-a-url" })));
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("blocks a localhost redirect from production", async () => {
    const authorize = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
    authorize.searchParams.set("redirect_to", "http://localhost:3000/auth/callback");
    const { status, body } = await readJson(
      await POST(jsonRequest({ url: authorize.toString() }, "duoshot.vercel.app")),
    );
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("localhost_redirect");
  });

  it("allows a production authorize URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 302 });
    vi.stubGlobal("fetch", fetchMock);
    const authorize = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
    authorize.searchParams.set("redirect_to", "https://duoshot.vercel.app/auth/callback");
    const { status, body } = await readJson(
      await POST(jsonRequest({ url: authorize.toString() }, "duoshot.vercel.app")),
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });
});
