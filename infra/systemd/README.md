# Application maintenance on the dedicated VPS

These systemd timers replace `vercel.json` crons: Storage every 15 minutes,
analytics erasure daily at 04:00 UTC. Run only after the compatible application
and schema have been installed. The container name is pinned to the current
Coolify service; update it if that resource is recreated.

Install the three unit files in `/etc/systemd/system/`, then validate with
`systemd-analyze verify` and run `systemctl daemon-reload`.
Test both `duoshot-maintenance@storage` and `duoshot-maintenance@analytics`
with `systemctl start`, inspect their result, then enable the timers with
`systemctl enable --now duoshot-storage.timer duoshot-analytics.timer`.

The scripts read the existing CRON_SECRET inside the application container.
No secrets are stored in systemd units or command arguments. Inspect failures
with `journalctl -u 'duoshot-maintenance@*'`. A successful analytics HTTP response
with an empty queue does not validate Mixpanel credentials or remote deletion.

Backups are separate. These timers do not create or replace off-host backups.

## Durable render worker

After applying `20260926190000_render_jobs.sql`, deploy the compatible image,
set `RENDER_QUEUE_ENABLED=true` in the private application environment and keep
`RENDER_CONCURRENCY=1`. Install `duoshot-render-worker.service`, reload systemd,
then enable/start it. It calls the protected loopback worker endpoint and reads
the existing CRON_SECRET inside the container. No user access tokens are stored.

PostgreSQL admits at most 51 pending jobs globally and one per user. A lease
expires after 90 seconds without a heartbeat; queued work survives restarts and
interrupted work retries up to three attempts with the same export reservation.
Completion, export metadata and quota settlement commit in one transaction.
Old lease tokens cannot commit/refund a new attempt. Waiting work expires after
30 minutes, completed/failed job metadata after 24 hours. Physical orphan files
are removed by the existing Storage cleanup timer.

The browser persists the request key and job ID under the signed-in user's key,
polls status and resumes on reload. Completed export URLs are signed afresh.
Backups must drain/stop the web container (which also stops active render work)
before stopping Supabase writes. Restart the worker with the web after maintenance.

Rollback: stop admission (`RENDER_QUEUE_ENABLED=false`) only after draining all
queued/running jobs, then stop the worker. Keep the queue schema and metadata
until existing results have expired; do not drop it while requests remain.
