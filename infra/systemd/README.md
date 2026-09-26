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
