// Environment rules shared by the app (src/lib/env-check.ts, at server and worker
// startup) and the VPS audit (scripts/check-deployment-env.mjs). Plain ESM so the
// audit runs in the image without a TypeScript toolchain. Names only, never values.

export const APP_ENVS = ['production', 'test', 'development'];
export const RENDER_WORKER_MODES = ['process', 'http'];
export const STRIPE_CHECKOUT_VARS = [
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'STRIPE_INDIE_PRICE_ID', 'STRIPE_STUDIO_PRICE_ID', 'STRIPE_INDIE_YEARLY_PRICE_ID', 'STRIPE_STUDIO_YEARLY_PRICE_ID',
];
export const WORKER_TIMEOUT_VARS = ['RENDER_JOB_TIMEOUT_MS', 'ASC_JOB_TIMEOUT_MS', 'RENDER_WORKER_STOP_GRACE_MS'];
/** The worker would fail an upload before the executor's own 10-minute Apple budget and rollback. */
export const ASC_MIN_JOB_TIMEOUT_MS = 660_000;

export const LIVE_STRIPE_KEY = /^(sk|rk)_live_.+/;
export const TEST_STRIPE_KEY = /^(sk|rk)_test_.+/;

export function supabasePublicKey(env) {
  return env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

export function supabaseAdminKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || undefined;
}

/** 32 bytes of standard base64 (AES-256-GCM master key). */
export function ascEncryptionKeyValid(value) {
  const key = value?.trim() ?? '';
  return /^[A-Za-z0-9+/]+={0,2}$/.test(key) && Buffer.from(key, 'base64').length === 32;
}

function timeoutProblems(env) {
  const problems = [];
  for (const name of WORKER_TIMEOUT_VARS) {
    if (env[name] && !(Number(env[name]) > 0)) problems.push(`${name} (positive milliseconds)`);
  }
  if (Number(env.ASC_JOB_TIMEOUT_MS) > 0 && Number(env.ASC_JOB_TIMEOUT_MS) < ASC_MIN_JOB_TIMEOUT_MS) {
    problems.push(`ASC_JOB_TIMEOUT_MS (${ASC_MIN_JOB_TIMEOUT_MS} or more)`);
  }
  return problems;
}

/**
 * Configuration that cannot work, checked when a server or worker process starts:
 * the base Supabase/site variables in production, and every enabled feature flag
 * whose prerequisites are missing. Softer deployment policy (secret length, live
 * keys, HTTPS) stays in deploymentProblems().
 */
export function startupProblems(env, processKind = 'web') {
  const problems = [];
  if (env.APP_ENV && !APP_ENVS.includes(env.APP_ENV)) problems.push(`APP_ENV (${APP_ENVS.join(', ')})`);
  // The render worker checks its own basics (src/worker/loop.ts workerConfigErrors).
  if (env.APP_ENV === 'production' && processKind === 'web') {
    for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) if (!env[name]) problems.push(name);
    if (!supabasePublicKey(env)) problems.push('SUPABASE_PUBLIC_KEY');
    if (!supabaseAdminKey(env)) problems.push('SUPABASE_ADMIN_KEY');
    if (!env.CRON_SECRET) problems.push('CRON_SECRET');
  }
  // The worker bearer secret is only needed by RENDER_WORKER_MODE=http; the VPS audit checks it.
  if (env.RENDER_QUEUE_ENABLED === 'true') {
    if (!supabaseAdminKey(env)) problems.push('SUPABASE_ADMIN_KEY (required by RENDER_QUEUE_ENABLED)');
  }
  if (env.RENDER_WORKER_MODE && !RENDER_WORKER_MODES.includes(env.RENDER_WORKER_MODE)) {
    problems.push('RENDER_WORKER_MODE (process or http)');
  }
  problems.push(...timeoutProblems(env));
  if (env.STRIPE_CHECKOUT_ENABLED === 'true') {
    for (const name of STRIPE_CHECKOUT_VARS) if (!env[name]) problems.push(`${name} (required by STRIPE_CHECKOUT_ENABLED)`);
    if (!supabaseAdminKey(env)) problems.push('SUPABASE_ADMIN_KEY (required by STRIPE_CHECKOUT_ENABLED)');
  }
  if (env.ASC_CONNECTOR_ENABLED === 'true') {
    if (!ascEncryptionKeyValid(env.ASC_ENCRYPTION_KEY)) problems.push('ASC_ENCRYPTION_KEY (32 bytes base64, required by ASC_CONNECTOR_ENABLED)');
    if (env.RENDER_QUEUE_ENABLED !== 'true') problems.push('RENDER_QUEUE_ENABLED (App Store Connect uploads run on the queue)');
  }
  return problems;
}

/** The production VPS audit run by scripts/check-deployment-env.mjs. */
export function deploymentProblems(env) {
  const required = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
  const missing = required.filter((name) => !env[name]);
  if (!supabasePublicKey(env)) missing.push('SUPABASE_PUBLIC_KEY');
  if (!supabaseAdminKey(env)) missing.push('SUPABASE_ADMIN_KEY');
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) missing.push('CRON_SECRET (32+ characters)');
  if (env.RENDER_QUEUE_ENABLED === 'true') {
    if (!env.RENDER_WORKER_SECRET || env.RENDER_WORKER_SECRET.length < 32) missing.push('RENDER_WORKER_SECRET (32+ characters)');
    // One shared value would let a leaked cron secret drive renders again.
    else if (env.RENDER_WORKER_SECRET === env.CRON_SECRET) missing.push('RENDER_WORKER_SECRET (must differ from CRON_SECRET)');
  }
  if (!RENDER_WORKER_MODES.includes(env.RENDER_WORKER_MODE || 'process')) missing.push('RENDER_WORKER_MODE (process or http)');
  missing.push(...timeoutProblems(env));
  for (const name of required) {
    if (!env[name]) continue;
    try { if (new URL(env[name]).protocol !== 'https:') missing.push(`${name} (HTTPS required)`); }
    catch { missing.push(`${name} (invalid URL)`); }
  }
  if (env.APP_ENV !== 'production') missing.push('APP_ENV (production required on the VPS)');
  if (env.E2E_CHECKOUT_DISPLAY) missing.push('E2E_CHECKOUT_DISPLAY (CI only, must be unset)');
  if (env.STRIPE_CHECKOUT_ENABLED === 'true') {
    for (const name of STRIPE_CHECKOUT_VARS) if (!env[name]) missing.push(name);
    if (!LIVE_STRIPE_KEY.test(env.STRIPE_SECRET_KEY ?? '')) missing.push('STRIPE_SECRET_KEY (live required)');
    if (env.STRIPE_LIVE_ENABLED !== 'true') missing.push('STRIPE_LIVE_ENABLED');
  }
  if (env.ASC_CONNECTOR_ENABLED === 'true') {
    if (!ascEncryptionKeyValid(env.ASC_ENCRYPTION_KEY)) missing.push('ASC_ENCRYPTION_KEY (32 bytes base64)');
    if (env.RENDER_QUEUE_ENABLED !== 'true') missing.push('RENDER_QUEUE_ENABLED (App Store Connect uploads run on the queue)');
  }
  return missing;
}
