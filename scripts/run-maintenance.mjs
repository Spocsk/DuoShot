// Run inside the Coolify application container. Never log the bearer secret.
const endpoints = {
  storage: '/api/cron/storage-cleanup',
  analytics: '/api/cron/analytics-erasure',
};
const endpoint = endpoints[process.argv[2]];
const secret = process.env.CRON_SECRET;
if (!endpoint || !secret) {
  console.error('Expected storage|analytics and CRON_SECRET');
  process.exit(1);
}
try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}${endpoint}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(55_000),
  });
  console.log(JSON.stringify({ task: process.argv[2], status: response.status }));
  if (!response.ok) process.exitCode = 1;
} catch {
  console.error(JSON.stringify({ task: process.argv[2], error: 'MAINTENANCE_UNAVAILABLE' }));
  process.exitCode = 1;
}
