type Env = Record<string, string | undefined>;

export const APP_ENVS: string[];
export const RENDER_WORKER_MODES: string[];
export const STRIPE_CHECKOUT_VARS: string[];
export const WORKER_TIMEOUT_VARS: string[];
export const ASC_MIN_JOB_TIMEOUT_MS: number;
export const LIVE_STRIPE_KEY: RegExp;
export const TEST_STRIPE_KEY: RegExp;
export function supabasePublicKey(env: Env): string | undefined;
export function supabaseAdminKey(env: Env): string | undefined;
export function ascEncryptionKeyValid(value: string | undefined): boolean;
export function startupProblems(env: Env, processKind?: "web" | "worker"): string[];
export function deploymentProblems(env: Env): string[];
