#!/bin/sh
# Run on the dedicated host; never prints generated credentials.
# Requires a COPY of the official docker/ directory in a fresh destination.
set -eu
umask 077
cd "${1:?Usage: prepare-private.sh /absolute/path/to/fresh/supabase}"
test -f docker-compose.yml
test -f compose.cx23.yml
if test -e .env; then
  echo 'Refusing to overwrite existing credentials.' >&2
  exit 1
fi
cp .env.example .env
sh utils/generate-keys.sh --update-env >/dev/null
sh utils/add-new-auth-keys.sh --update-env >/dev/null
python3 - <<'PY'
from pathlib import Path
values = {
    'COMPOSE_FILE': 'docker-compose.yml:compose.cx23.yml',
    'SITE_URL': 'https://duoshot.site',
    'ADDITIONAL_REDIRECT_URLS': 'https://duoshot.site/auth/callback',
    'SUPABASE_PUBLIC_URL': 'http://127.0.0.1:8000',
    'API_EXTERNAL_URL': 'http://127.0.0.1:8000/auth/v1',
    'DISABLE_SIGNUP': 'true',
    'ENABLE_EMAIL_AUTOCONFIRM': 'false',
    'ENABLE_PHONE_SIGNUP': 'false',
    'ENABLE_PHONE_AUTOCONFIRM': 'false',
    'SMTP_HOST': '', 'SMTP_USER': '', 'SMTP_PASS': '',
    'SMTP_ADMIN_EMAIL': '', 'SMTP_SENDER_NAME': 'DuoShot',
    'OPENAI_API_KEY': '',
    'STUDIO_DEFAULT_PROJECT': 'DuoShot',
    'STORAGE_TENANT_ID': 'duoshot', 'REGION': 'eu-central',
}
path = Path('.env')
path.write_text('\n'.join(
    f'{line.split("=", 1)[0]}={values[line.split("=", 1)[0]]}'
    if '=' in line and line.split('=', 1)[0] in values else line
    for line in path.read_text().splitlines()
) + '\n')
path.chmod(0o600)
for old in Path('.').glob('.env.old*'):
    old.chmod(0o600)
PY
docker compose config --quiet
echo 'Private Supabase configuration ready. Credentials remain on this host.'
