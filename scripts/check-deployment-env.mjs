// Print configuration status only, never values or credentials.
// The rules are shared with the app's startup check (scripts/lib/env-rules.mjs).
import { deploymentProblems } from './lib/env-rules.mjs';

const env = process.env;
const missing = deploymentProblems(env);
console.log(JSON.stringify({
  configured: missing.length === 0, missing,
  renderQueueEnabled: env.RENDER_QUEUE_ENABLED === 'true',
  renderWorkerMode: env.RENDER_WORKER_MODE || 'process',
  checkoutEnabled: env.STRIPE_CHECKOUT_ENABLED === 'true',
  ascConnectorEnabled: env.ASC_CONNECTOR_ENABLED === 'true',
  // Optional: the one-time pass is hidden unless its Stripe price is set.
  pass30Configured: Boolean(env.STRIPE_PRICE_PASS30),
  mixpanelErasureConfigured: Boolean(env.MIXPANEL_PROJECT_TOKEN && env.MIXPANEL_GDPR_OAUTH_TOKEN),
  invitationsConfigured: Boolean(env.RESEND_API_KEY),
}, null, 2));
if (missing.length) process.exitCode = 1;
