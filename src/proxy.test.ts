import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));

const call = (headers: Record<string, string>, path = "/api/internal/render-worker") =>
  proxy(new NextRequest(`http://127.0.0.1:3000${path}`, { method: "POST", headers }));

describe("proxy internal-route gate", () => {
  it("lets the worker's loopback call through to the route", async () => {
    const response = await call({ host: "127.0.0.1:3000", "x-forwarded-for": "127.0.0.1" });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("answers 404 to anything routed by Traefik or addressed by a public name", async () => {
    expect((await call({ host: "duoshot.site", "x-real-ip": "203.0.113.9", "x-forwarded-for": "203.0.113.9" })).status).toBe(404);
    expect((await call({ host: "127.0.0.1:3000", "x-real-ip": "203.0.113.9" })).status).toBe(404);
    expect((await call({ host: "duoshot.site" }, "/api/internal")).status).toBe(404);
  });
});
