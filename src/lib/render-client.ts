"use client";

type Kind = "export" | "review";
type Pending = { key: string; body: string; jobId?: string };
type Progress = (state: "queued" | "running") => void;
const active = new Map<string, Promise<Response>>();
const storageKey = (user: string, kind: Kind) => `duoshot:render:${user}:${kind}`;
function read(key: string): Pending | null {
  try { const value = JSON.parse(localStorage.getItem(key) ?? "null"); return value && typeof value.key === "string" && typeof value.body === "string" ? value : null; } catch { return null; }
}
function save(key: string, pending: Pending | null) {
  try { if (pending) localStorage.setItem(key, JSON.stringify(pending)); else localStorage.removeItem(key); } catch { /* in-memory work still completes when persistence is unavailable */ }
}
async function run(key: string, kind: Kind, pending: Pending, progress: Progress): Promise<Response> {
  if (!pending.jobId) {
    const response = await fetch(kind === "export" ? "/api/export" : "/api/reviews", {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": pending.key }, body: pending.body,
    });
    if (response.status !== 202) { save(key, null); return response; }
    const payload = await response.json();
    if (typeof payload.jobId !== "string" || !/^[a-f0-9-]{36}$/i.test(payload.jobId)) throw new Error("RENDER_UNAVAILABLE");
    pending.jobId = payload.jobId;
    save(key, pending);
  }
  const deadline = Date.now() + 31 * 60_000;
  while (Date.now() < deadline) {
    let response: Response;
    try { response = await fetch(`/api/render-jobs/${pending.jobId}`, { cache: "no-store" }); }
    catch { await new Promise(resolve => setTimeout(resolve, 3000)); continue; }
    if (response.status >= 500) { await new Promise(resolve => setTimeout(resolve, 3000)); continue; }
    if (!response.ok) { if (response.status !== 401) save(key, null); return response; }
    const payload = await response.json();
    if (payload.state === "completed") { save(key, null); return Response.json(payload.result); }
    if (payload.state === "failed") { save(key, null); return Response.json({ error: payload.error }, { status: 400 }); }
    progress(payload.state === "running" ? "running" : "queued");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("RENDER_PENDING");
}
function start(key: string, kind: Kind, pending: Pending, progress: Progress) {
  let result = active.get(key);
  if (!result) {
    result = run(key, kind, pending, progress).finally(() => active.delete(key));
    active.set(key, result);
  }
  // Multiple mounted consumers must not consume the same Response body.
  return result.then(response => response.clone());
}
export function submitRender(user: string, kind: Kind, body: unknown, progress: Progress) {
  const key = storageKey(user, kind);
  const pending = read(key) ?? { key: crypto.randomUUID(), body: JSON.stringify(body) };
  save(key, pending);
  return start(key, kind, pending, progress);
}
export function resumeRender(user: string, kind: Kind, progress: Progress): Promise<Response> | null {
  const key = storageKey(user, kind), pending = read(key);
  return pending ? start(key, kind, pending, progress) : null;
}
