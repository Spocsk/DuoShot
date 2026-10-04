import { startupProblems } from "../../scripts/lib/env-rules.mjs";

type Env = Record<string, string | undefined>;

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
export function assertServerEnv(processName: string, env: Env = process.env) {
  const problems = startupProblems(env);
  if (!problems.length) return;
  const error = new EnvConfigError(problems, processName);
  if (env.NODE_ENV === "production" || env.APP_ENV === "production") throw error;
  console.warn(error.message);
}
