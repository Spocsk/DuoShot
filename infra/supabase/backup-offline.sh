#!/usr/bin/env bash
# Consistent maintenance backup: briefly stops the API/Auth/Storage, keeps DB up.
# Run only during a maintenance window after the application/worker is drained.
set -euo pipefail
umask 077
if [[ "${1:-}" != --offline ]]; then
  echo 'Usage: backup-offline.sh --offline /path/to/coolify/compose/directory' >&2
  exit 2
fi
DUOSHOT_COMPOSE_DIR="${2:?Compose directory required}"
DUOSHOT_ROOT=/data/duoshot/supabase
DUOSHOT_BACKUPS=/data/duoshot/backups
test -s /data/duoshot/backup-recipient.txt
test -f "$DUOSHOT_COMPOSE_DIR/docker-compose.yml"
mkdir -p "$DUOSHOT_BACKUPS"
exec 9>/data/duoshot/backup.lock
flock -n 9 || { echo 'Another backup is running.' >&2; exit 1; }
DUOSHOT_STAGING="$(mktemp -d /data/duoshot/backup-staging.XXXXXX)"
DUOSHOT_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUOSHOT_OUTPUT="$DUOSHOT_BACKUPS/$DUOSHOT_STAMP.tar.gz.age"
cd "$DUOSHOT_COMPOSE_DIR"
restore_services() {
  local result=$?
  trap - EXIT
  docker compose up -d --wait >/dev/null 2>&1 || result=1
  rm -rf -- "$DUOSHOT_STAGING"
  exit "$result"
}
trap restore_services EXIT
docker compose stop api-gw auth rest storage >/dev/null
DUOSHOT_DB="$(docker compose ps -q db)"
test -n "$DUOSHOT_DB"
docker exec "$DUOSHOT_DB" pg_dumpall -U supabase_admin --roles-only > "$DUOSHOT_STAGING/roles.sql"
docker exec "$DUOSHOT_DB" pg_dump -U supabase_admin -Fc postgres > "$DUOSHOT_STAGING/postgres.dump"
docker exec "$DUOSHOT_DB" pg_dump -U supabase_admin -Fc _supabase > "$DUOSHOT_STAGING/internal.dump"
# Capture a small restore check, without copying any user content into logs.
docker exec "$DUOSHOT_DB" psql -U supabase_admin -d postgres -Atc \
  "select json_build_object('auth_users', (select count(*) from auth.users), 'workspaces', (select count(*) from public.workspaces), 'storage_objects', (select count(*) from storage.objects));" \
  > "$DUOSHOT_STAGING/row-counts.json"
test -s /data/duoshot/app.env
cp /data/duoshot/app.env "$DUOSHOT_STAGING/app.env"
cp docker-compose.yml "$DUOSHOT_STAGING/coolify-compose.yml"
python3 - "$DUOSHOT_STAGING/manifest.json" <<'PY'
import datetime, json, sys
from pathlib import Path
Path(sys.argv[1]).write_text(json.dumps({
    'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'source': 'duoshot-prod', 'database_format': 'pg_dump-custom',
    'supabase_release': 'self-hosted/v0.8.2', 'offline': True,
}) + '\n')
PY
tar -czf - -C "$DUOSHOT_STAGING" . -C "$DUOSHOT_ROOT" \
  .env runtime-env volumes/storage volumes/db/config volumes/api \
  | age -R /data/duoshot/backup-recipient.txt -o "$DUOSHOT_OUTPUT.partial"
mv "$DUOSHOT_OUTPUT.partial" "$DUOSHOT_OUTPUT"
sha256sum "$DUOSHOT_OUTPUT" > "$DUOSHOT_OUTPUT.sha256"
echo "$DUOSHOT_OUTPUT"
# No automatic deletion/retention here: confirm off-host copies before pruning.
