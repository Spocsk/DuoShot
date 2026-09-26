#!/usr/bin/env bash
set -euo pipefail
umask 077
exec 8>/data/duoshot/nightly-backup.lock
flock -n 8 || exit 0
stamp="$(date -u +%F)"
if [[ -f /data/duoshot/backup-last-success ]] && [[ "$(cat /data/duoshot/backup-last-success)" == "$stamp" ]]; then exit 0; fi
pending="$(docker exec db-5if8qfnj7o1bi2lrd3nbncff psql -U supabase_admin -d postgres -Atc "select count(*) from render_jobs where state in ('queued','running');")"
if [[ "$pending" != 0 ]]; then echo 'Backup deferred: renders pending; retry at the next timer tick.'; exit 0; fi
restart_web() { docker start web-i9qtpe5bpyig86s1aljxr5gv >/dev/null; }
trap restart_web EXIT
docker stop --time 60 web-i9qtpe5bpyig86s1aljxr5gv >/dev/null
archive="$(/data/duoshot/backup-offline.sh --offline /data/coolify/services/5if8qfnj7o1bi2lrd3nbncff)"
restart_web
trap - EXIT
systemctl start duoshot-render-worker.service
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:3000/api/health >/dev/null
name="$(basename "$archive")"
digest="$(sha256sum "$archive" | cut -d ' ' -f 1)"
size="$(stat -c %s "$archive")"
ack="$(ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/data/duoshot/backup-known-hosts -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i /data/duoshot/backup-push-key dylan@178.104.172.67 "store $name $digest $size" < "$archive")"
[[ "$ack" == "STORED $digest $name" ]]
printf '%s\n' "$stamp" > /data/duoshot/backup-last-success
python3 - <<'PY'
from pathlib import Path
import re
root = Path('/data/duoshot/backups')
archives = sorted(p for p in root.iterdir() if re.fullmatch(r'\d{8}T\d{6}Z\.tar\.gz\.age', p.name))
for old in archives[:-7]:
    old.unlink()
    Path(str(old) + '.sha256').unlink(missing_ok=True)
PY
echo "Encrypted backup verified off-host: $name"
