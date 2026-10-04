/** Runs once per Next server instance, before it accepts requests. */
export async function register() {
  // `next build` evaluates server code with placeholder environment; only a running server is checked.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertServerEnv, EnvConfigError } = await import("./lib/env-check");
  try {
    assertServerEnv("web");
  } catch (error) {
    if (!(error instanceof EnvConfigError)) throw error;
    // A thrown hook leaves Next answering 500 to every request; stop instead so the
    // deployment fails visibly and the previous container keeps serving.
    console.error(error.message);
    process.exit(1);
  }
}
