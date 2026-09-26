/** The worker keeps no user token. Durable claims, leases and results live in PostgreSQL. */
if (process.env.RENDER_QUEUE_ENABLED !== 'true' || !process.env.CRON_SECRET) throw new Error('Queue configuration missing');
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
while (!stopping) {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/internal/render-worker', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(1_200_000),
    });
    const result = await response.json();
    if (!response.ok) console.error('render_worker_tick_failed', { status: response.status });
    if (response.ok && result.processed) continue;
  } catch { console.error('render_worker_connection_failed'); }
  if (!stopping) await new Promise(resolve => setTimeout(resolve, 2000));
}
