import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { readJson } from "@/test/supabase-mock";
import { POST } from "./route";
import { GET as confirmGet, POST as confirmPost } from "./confirm/route";
import { GET as unsubscribeGet, POST as unsubscribePost } from "./unsubscribe/route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/lib/site", () => ({ getSiteUrl: () => "https://duoshot.example" }));

type Row = { id: string; email: string; topic: string; locale: string; token: string; confirmed_at: string | null };

/** In-memory stand-in for the waitlist table with the filters the routes use. */
function table(rows: Row[], options: { insertError?: unknown; lookupError?: unknown } = {}) {
  const calls = { insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
  function query(action: "select" | "update" | "delete", payload?: Partial<Row>) {
    const filters: [keyof Row, unknown][] = [];
    const matches = () => rows.filter((row) => filters.every(([key, value]) => row[key] === value));
    const run = () => {
      if (options.lookupError) return { data: null, error: options.lookupError };
      const found = matches();
      if (action === "update") found.forEach((row) => Object.assign(row, payload));
      if (action === "delete") found.forEach((row) => rows.splice(rows.indexOf(row), 1));
      return { data: found, error: null };
    };
    const builder = {
      eq: (key: keyof Row, value: unknown) => { filters.push([key, value]); return builder; },
      is: (key: keyof Row, value: unknown) => { filters.push([key, value]); return builder; },
      select: () => builder,
      maybeSingle: async () => { const result = run(); return { data: result.data?.[0] ?? null, error: result.error }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(run()).then(resolve),
    };
    return builder;
  }
  const admin = {
    from: () => ({
      select: () => query("select"),
      update: (payload: Partial<Row>) => { calls.update(payload); return query("update", payload); },
      delete: () => { calls.delete(); return query("delete"); },
      insert: async (row: Omit<Row, "id" | "confirmed_at">) => {
        calls.insert(row);
        if (options.insertError) return { error: options.insertError };
        rows.push({ id: `row-${rows.length + 1}`, confirmed_at: null, ...row });
        return { error: null };
      },
    }),
  };
  vi.mocked(createAdminSupabase).mockReturnValue(admin as never);
  return calls;
}

const signup = (body: unknown) => POST(new Request("http://localhost/api/waitlist", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body),
}));
const form = (path: string, token: string) => new Request(`http://localhost${path}`, {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }).toString(),
});
const TOKEN = "a".repeat(43);

beforeEach(() => {
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue({ sent: true, mocked: false });
});

describe("POST /api/waitlist", () => {
  it.each([
    [{ email: "not-an-email" }, "INVALID_EMAIL"],
    [{ email: `${"a".repeat(250)}@example.com` }, "INVALID_EMAIL"],
    [{ email: "a@example.com, b@example.com" }, "INVALID_EMAIL"],
    [{ email: "dev@example.com", topic: "newsletter" }, "INVALID_TOPIC"],
  ])("rejects %j", async (body, error) => {
    const calls = table([]);
    const { status, body: payload } = await readJson(await signup(body));
    expect(status).toBe(400);
    expect(payload.error).toBe(error);
    expect(calls.insert).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before parsing", async () => {
    table([]);
    expect((await signup(JSON.stringify({ email: "dev@example.com", pad: "x".repeat(4000) }))).status).toBe(413);
  });

  it("stores a pending address and sends a double opt-in e-mail without exposing the token", async () => {
    const rows: Row[] = [];
    table(rows);
    const { status, body } = await readJson(await signup({ email: " Dev@Example.com ", locale: "en" }));
    expect(status).toBe(202);
    expect(body).toEqual({ ok: true });
    expect(rows).toEqual([expect.objectContaining({ email: "dev@example.com", topic: "apple_duo_open", locale: "en", confirmed_at: null })]);
    expect(rows[0].token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const mail = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(mail.to).toBe("dev@example.com");
    expect(mail.text).toContain(`https://duoshot.example/api/waitlist/confirm?token=${rows[0].token}&lang=en`);
    expect(mail.text).toContain(`https://duoshot.example/api/waitlist/unsubscribe?token=${rows[0].token}&lang=en`);
    expect(JSON.stringify(body)).not.toContain(rows[0].token);
  });

  it("writes the French e-mail with « vous »", async () => {
    table([]);
    await signup({ email: "dev@example.com", topic: "launch" });
    const mail = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(mail.subject).toBe("Confirmez votre alerte DuoShot");
    expect(mail.text).toContain("Vous avez demandé");
  });

  it("answers identically for a confirmed address and sends nothing", async () => {
    const calls = table([{ id: "row-1", email: "dev@example.com", topic: "apple_duo_open", locale: "fr", token: TOKEN, confirmed_at: "2026-10-01T00:00:00Z" }]);
    const { status, body } = await readJson(await signup({ email: "dev@example.com" }));
    expect(status).toBe(202);
    expect(body).toEqual({ ok: true });
    expect(calls.insert).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("resends the existing link for a pending address instead of duplicating it", async () => {
    const calls = table([{ id: "row-1", email: "dev@example.com", topic: "apple_duo_open", locale: "fr", token: TOKEN, confirmed_at: null }]);
    expect((await signup({ email: "dev@example.com" })).status).toBe(202);
    expect(calls.insert).not.toHaveBeenCalled();
    expect(vi.mocked(sendTransactionalEmail).mock.calls[0][0].text).toContain(TOKEN);
  });

  it("silently drops honeypot submissions", async () => {
    const calls = table([]);
    expect((await signup({ email: "bot@example.com", company: "Acme" })).status).toBe(202);
    expect(calls.insert).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("reports unavailability rather than pretending success", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    expect((await signup({ email: "dev@example.com" })).status).toBe(503);
    table([], { lookupError: { message: "down" } });
    expect((await signup({ email: "dev@example.com" })).status).toBe(503);
    table([]);
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error("EMAIL_DELIVERY_FAILED"));
    expect((await readJson(await signup({ email: "dev@example.com" }))).body.error).toBe("EMAIL_FAILED");
  });
});

describe("waitlist confirmation and unsubscribe links", () => {
  const pending = (): Row => ({ id: "row-1", email: "dev@example.com", topic: "apple_duo_open", locale: "en", token: TOKEN, confirmed_at: null });

  it("does not confirm on GET, so link scanners cannot opt someone in", async () => {
    const rows = [pending()];
    const calls = table(rows);
    const response = await confirmGet(new Request(`http://localhost/api/waitlist/confirm?token=${TOKEN}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('method="post" action="/api/waitlist/confirm"');
    expect(calls.update).not.toHaveBeenCalled();
    expect(rows[0].confirmed_at).toBeNull();
  });

  it("sets confirmed_at on POST and keeps the token for later unsubscribe links", async () => {
    const rows = [pending()];
    table(rows);
    const response = await confirmPost(form("/api/waitlist/confirm", TOKEN));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("on the list");
    expect(rows[0].confirmed_at).toEqual(expect.any(String));
    expect(rows[0].token).toBe(TOKEN);
  });

  it("rejects unknown or malformed tokens", async () => {
    table([]);
    expect((await confirmPost(form("/api/waitlist/confirm", TOKEN))).status).toBe(404);
    expect((await confirmGet(new Request("http://localhost/api/waitlist/confirm?token=short"))).status).toBe(404);
    expect((await unsubscribePost(form("/api/waitlist/unsubscribe", "<script>"))).status).toBe(404);
  });

  it("erases the row on unsubscribe POST, never on GET", async () => {
    const rows = [pending()];
    const calls = table(rows);
    const page = await unsubscribeGet(new Request(`http://localhost/api/waitlist/unsubscribe?token=${TOKEN}`));
    expect(await page.text()).toContain('action="/api/waitlist/unsubscribe"');
    expect(calls.delete).not.toHaveBeenCalled();
    const response = await unsubscribePost(form("/api/waitlist/unsubscribe", TOKEN));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Address removed");
    expect(rows).toEqual([]);
  });
});
