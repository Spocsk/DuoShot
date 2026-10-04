/** The worker keeps no user token. Durable claims, leases and results live in PostgreSQL. */
// RENDER_WORKER_SECRET is the worker's own bearer; CRON_SECRET is only a rollout fallback,
// matching the route, until the dedicated secret is set in the application environment.
const secret = process.env.RENDER_WORKER_SECRET || process.env.CRON_SECRET;
if (process.env.RENDER_QUEUE_ENABLED !== 'true' || !secret) throw new Error('Queue configuration missing');
if (!process.env.RENDER_WORKER_SECRET) console.warn('render_worker_secret_fallback', { using: 'CRON_SECRET' });
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

/**
 * One loop per lane: renders (export, review) and App Store Connect uploads each have
 * their own slot, so an upload waiting on Apple never holds up an export. The asc lane
 * answers idle while ASC_CONNECTOR_ENABLED is off in the application.
 */
async function poll(lane, idleMs) {
  const url = `http://127.0.0.1:3000/api/internal/render-worker${lane === 'render' ? '' : `?lane=${lane}`}`;
  while (!stopping) {
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(1_200_000),
      });
      // Error bodies are not always JSON (the proxy answers a bare 404 outside the private network).
      if (!response.ok) console.error('render_worker_tick_failed', { lane, status: response.status });
      else if ((await response.json()).processed) continue;
    } catch { console.error('render_worker_connection_failed', { lane }); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, idleMs));
  }
}

await Promise.all([poll('render', 2000), poll('asc', 5000)]);
