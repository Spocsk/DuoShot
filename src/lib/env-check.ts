import { startupProblems } from "../../scripts/lib/env-rules.mjs";

type Env = Record<string, string | undefined>;

/**
 * The process environment plus the NEXT_PUBLIC_* values, read literally so that
 * values Next inlined at build time count even when the runtime env omits them.
 */
function runtimeEnv(): Env {
  return {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export class EnvConfigError extends Error {
  constructor(readonly problems: string[], process: string) {
    super(`${process}: invalid environment configuration (names only): ${problems.join("; ")}. ` +
      "Fix the environment file, then run `node scripts/check-deployment-env.mjs`.");
    this.name = "EnvConfigError";
  }
}

/**
 * Fails fast when an enabled feature cannot work (see scripts/lib/env-rules.mjs).
 * Strict in production builds (`next start`, the image, the worker); in `next dev`
 * it only warns so a partial local setup keeps running.
 */
export function assertServerEnv(processName: "web" | "worker", env: Env = runtimeEnv()) {
  const problems = startupProblems(env, processName);
  if (!problems.length) return;
  const error = new EnvConfigError(problems, processName);
  if (env.NODE_ENV === "production" || env.APP_ENV === "production") throw error;
  console.warn(error.message);
}
