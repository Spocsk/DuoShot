import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildRenderWorker } from "../../scripts/build-render-worker.mjs";

/**
 * Builds the real bundle and runs it against a stub Supabase REST endpoint. The bundle
 * sits under node_modules/.cache so the external sharp resolves as it does in the image.
 */
const root = path.resolve(__dirname, "../..");
let dir: string;
let bundle: string;
let server: Server;
let supabaseUrl: string;
const calls: { path: string; apikey: string | undefined }[] = [];

beforeAll(async () => {
  mkdirSync(path.join(root, "node_modules/.cache"), { recursive: true });
  dir = mkdtempSync(path.join(root, "node_modules/.cache/render-worker-smoke-"));
  bundle = await buildRenderWorker(path.join(dir, "render-worker.mjs"));
  server = createServer((request: IncomingMessage, response) => {
    calls.push({ path: request.url ?? "", apikey: request.headers.apikey as string | undefined });
    request.resume();
    // No queued job in either lane.
    response.writeHead(200, { "content-type": "application/json" }).end("null");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  supabaseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function run(args: string[], env: Record<string, string>, onSpawn?: (child: ChildProcess) => void) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [bundle, ...args], {
      cwd: root, env: { PATH: process.env.PATH ?? "", NODE_ENV: "production", ...env }, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk; });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk; });
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`worker did not exit: ${stdout}${stderr}`)); }, 15_000);
    child.on("exit", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    onSpawn?.(child);
  });
}

const env = () => ({
  RENDER_QUEUE_ENABLED: "true", SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  NEXT_PUBLIC_SUPABASE_URL: "https://api.example.test", SUPABASE_INTERNAL_URL: supabaseUrl,
});

describe("render worker bundle", { timeout: 20_000 }, () => {
  it("loads with its native modules", async () => {
    const result = await run(["--check"], {});
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('"ok":true');
  });

  it("refuses to start without its configuration and names what is missing", async () => {
    const result = await run(["--once"], {});
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("RENDER_QUEUE_ENABLED");
    expect(result.stderr).toContain("SUPABASE_ADMIN_KEY");
  });

  it("claims each lane once with the service key and exits cleanly when no job is queued", async () => {
    calls.length = 0;
    const result = await run(["--once"], { ...env(), ASC_CONNECTOR_ENABLED: "true" });
    expect(result.code, result.stderr).toBe(0);
    expect(calls.map((call) => call.path).sort()).toEqual(["/rest/v1/rpc/claim_asc_upload", "/rest/v1/rpc/claim_render"]);
    expect(calls.every((call) => call.apikey === "service-role-test")).toBe(true);
    expect(result.stdout).toContain("render_worker_stopped");
  });

  it("stops polling and exits 0 on SIGTERM", async () => {
    calls.length = 0;
    const result = await run([], env(), (child) => {
      const wait = setInterval(() => { if (calls.length) { clearInterval(wait); child.kill("SIGTERM"); } }, 20);
    });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("render_worker_stopping");
    // The asc lane stays idle without claiming while the connector is off.
    expect(calls.every((call) => call.path === "/rest/v1/rpc/claim_render")).toBe(true);
  });
});
