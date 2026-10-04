/**
 * Standalone render worker: `node dist/render-worker.mjs` (bundled by
 * scripts/build-render-worker.mjs). Sharp renders and App Store Connect uploads run
 * here, outside the Next server, with a service-role Supabase client. Durable claims,
 * leases and results live in PostgreSQL; the worker keeps no user token.
 *
 *   --check  load the bundle and its native modules (sharp), then exit
 *   --once   one claim per lane, then exit
 */
import { createAdminSupabase } from "../lib/supabase/admin";
import { assertServerEnv } from "../lib/env-check";
import { createRenderWorker, workerConfigErrors, workerConfigFromEnv } from "./loop";

const args = new Set(process.argv.slice(2));

async function main() {
  if (args.has("--check")) {
    // Reaching this line means every import, including sharp's native binding, resolved.
    console.log(JSON.stringify({ ok: true, worker: "render" }));
    return 0;
  }
  const errors = workerConfigErrors();
  if (errors.length) {
    console.error("render_worker_config_missing", { missing: errors });
    return 1;
  }
  // Same startup rules as the web server: an enabled feature without its configuration stops here.
  assertServerEnv("render-worker");
  const admin = createAdminSupabase();
  if (!admin) return 1;
  const worker = createRenderWorker(admin, workerConfigFromEnv(process.env, args.has("--once")));
  process.on("SIGTERM", () => worker.stop("SIGTERM"));
  process.on("SIGINT", () => worker.stop("SIGINT"));
  // Next only logs these; a bare Node process would die mid-render.
  process.on("unhandledRejection", (reason) => {
    console.error("render_worker_unhandled_rejection", { message: reason instanceof Error ? reason.message : String(reason) });
  });
  const { abandonedWork } = await worker.run();
  console.log("render_worker_stopped", { abandonedWork });
  return 0;
}

// Exit explicitly: abandoned work (a timed-out Sharp render) would keep the event loop alive.
const exit = (code: number) => process.stdout.write("", () => process.exit(code));
main().then(exit, (error) => {
  console.error("render_worker_crashed", { message: error instanceof Error ? error.message : String(error) });
  exit(1);
});
