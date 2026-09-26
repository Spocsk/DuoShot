// Print configuration status only, never values or credentials.
const required = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const missing = required.filter((name) => !process.env[name]);
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('SUPABASE_PUBLIC_KEY');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) missing.push('SUPABASE_ADMIN_KEY');
if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) missing.push('CRON_SECRET (32+ characters)');
for (const name of required) {
  if (!process.env[name]) continue;
  try { if (new URL(process.env[name]).protocol !== 'https:') missing.push(`${name} (HTTPS required)`); }
  catch { missing.push(`${name} (invalid URL)`); }
}
if (process.env.STRIPE_CHECKOUT_ENABLED === 'true') {
  for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_INDIE_PRICE_ID', 'STRIPE_STUDIO_PRICE_ID', 'STRIPE_INDIE_YEARLY_PRICE_ID', 'STRIPE_STUDIO_YEARLY_PRICE_ID']) {
    if (!process.env[name]) missing.push(name);
  }
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) missing.push('STRIPE_SECRET_KEY (live required)');
  if (process.env.STRIPE_LIVE_ENABLED !== 'true') missing.push('STRIPE_LIVE_ENABLED');
}
console.log(JSON.stringify({
  configured: missing.length === 0, missing,
  renderQueueEnabled: process.env.RENDER_QUEUE_ENABLED === 'true',
  checkoutEnabled: process.env.STRIPE_CHECKOUT_ENABLED === 'true',
  mixpanelConfigured: Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN),
  erasureConfigured: Boolean(process.env.MIXPANEL_GDPR_OAUTH_TOKEN),
  invitationsConfigured: Boolean(process.env.RESEND_API_KEY),
}, null, 2));
if (missing.length) process.exitCode = 1;
