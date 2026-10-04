// Print configuration status only, never values or credentials.
const required = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const missing = required.filter((name) => !process.env[name]);
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('SUPABASE_PUBLIC_KEY');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) missing.push('SUPABASE_ADMIN_KEY');
if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) missing.push('CRON_SECRET (32+ characters)');
if (process.env.RENDER_QUEUE_ENABLED === 'true') {
  if (!process.env.RENDER_WORKER_SECRET || process.env.RENDER_WORKER_SECRET.length < 32) missing.push('RENDER_WORKER_SECRET (32+ characters)');
  // One shared value would let a leaked cron secret drive renders again.
  else if (process.env.RENDER_WORKER_SECRET === process.env.CRON_SECRET) missing.push('RENDER_WORKER_SECRET (must differ from CRON_SECRET)');
}
const renderWorkerMode = process.env.RENDER_WORKER_MODE || 'process';
if (!['process', 'http'].includes(renderWorkerMode)) missing.push('RENDER_WORKER_MODE (process or http)');
for (const name of ['RENDER_JOB_TIMEOUT_MS', 'ASC_JOB_TIMEOUT_MS', 'RENDER_WORKER_STOP_GRACE_MS']) {
  if (process.env[name] && !(Number(process.env[name]) > 0)) missing.push(`${name} (positive milliseconds)`);
}
// The worker would fail an upload before the executor's own 10-minute Apple budget and rollback.
if (Number(process.env.ASC_JOB_TIMEOUT_MS) > 0 && Number(process.env.ASC_JOB_TIMEOUT_MS) < 660_000) missing.push('ASC_JOB_TIMEOUT_MS (660000 or more)');
for (const name of required) {
  if (!process.env[name]) continue;
  try { if (new URL(process.env[name]).protocol !== 'https:') missing.push(`${name} (HTTPS required)`); }
  catch { missing.push(`${name} (invalid URL)`); }
}
if (process.env.APP_ENV !== 'production') missing.push('APP_ENV (production required on the VPS)');
if (process.env.E2E_CHECKOUT_DISPLAY) missing.push('E2E_CHECKOUT_DISPLAY (CI only, must be unset)');
if (process.env.STRIPE_CHECKOUT_ENABLED === 'true') {
  for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_INDIE_PRICE_ID', 'STRIPE_STUDIO_PRICE_ID', 'STRIPE_INDIE_YEARLY_PRICE_ID', 'STRIPE_STUDIO_YEARLY_PRICE_ID']) {
    if (!process.env[name]) missing.push(name);
  }
  if (!/^(sk|rk)_live_.+/.test(process.env.STRIPE_SECRET_KEY ?? '')) missing.push('STRIPE_SECRET_KEY (live required)');
  if (process.env.STRIPE_LIVE_ENABLED !== 'true') missing.push('STRIPE_LIVE_ENABLED');
}
if (process.env.ASC_CONNECTOR_ENABLED === 'true') {
  const key = process.env.ASC_ENCRYPTION_KEY?.trim() ?? '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(key) || Buffer.from(key, 'base64').length !== 32) missing.push('ASC_ENCRYPTION_KEY (32 bytes base64)');
  if (process.env.RENDER_QUEUE_ENABLED !== 'true') missing.push('RENDER_QUEUE_ENABLED (App Store Connect uploads run on the queue)');
}
console.log(JSON.stringify({
  configured: missing.length === 0, missing,
  renderQueueEnabled: process.env.RENDER_QUEUE_ENABLED === 'true',
  renderWorkerMode,
  checkoutEnabled: process.env.STRIPE_CHECKOUT_ENABLED === 'true',
  ascConnectorEnabled: process.env.ASC_CONNECTOR_ENABLED === 'true',
  // Optional: the one-time pass is hidden unless its Stripe price is set.
  pass30Configured: Boolean(process.env.STRIPE_PRICE_PASS30),
  mixpanelErasureConfigured: Boolean(process.env.MIXPANEL_PROJECT_TOKEN && process.env.MIXPANEL_GDPR_OAUTH_TOKEN),
  invitationsConfigured: Boolean(process.env.RESEND_API_KEY),
}, null, 2));
if (missing.length) process.exitCode = 1;
