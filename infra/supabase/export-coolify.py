#!/usr/bin/env python3
"""Prepare a secret-free Compose definition for Coolify on the same host.

Run inside the prepared Supabase directory. Credentials remain in root-only
per-service env files there. Does not start/stop containers or alter data.
"""
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
root = Path.cwd()
config = json.loads(subprocess.check_output(['docker', 'compose', 'config', '--format', 'json']))
services = config['services']
assert set(services) == {'api-gw', 'auth', 'rest', 'storage', 'db'}
# Coolify prefixes named volumes even when an explicit external name is supplied.
# Preserve the database encryption key in a stable bind mount instead.
key_dir = root / 'volumes/db/config'
if not key_dir.exists():
    key_dir.mkdir(mode=0o700)
    container = subprocess.check_output(['docker', 'compose', 'ps', '-q', 'db'], text=True).strip()
    assert container, 'Database must be running for the first key-directory copy'
    subprocess.run(['docker', 'cp', '-a', f'{container}:/etc/postgresql-custom/.', str(key_dir)], check=True)
    uid, gid, mode = subprocess.check_output([
        'docker', 'exec', container, 'stat', '-c', '%u %g %a', '/etc/postgresql-custom'
    ], text=True).split()
    os.chown(key_dir, int(uid), int(gid))
    key_dir.chmod(int(mode, 8))
assert any(key_dir.iterdir()), 'Database key directory is empty'
env_dir = root / 'runtime-env'
env_dir.mkdir(mode=0o700, exist_ok=True)
for name, service in services.items():
    values = service.pop('environment', {})
    lines = []
    for key, value in values.items():
        value = '' if value is None else str(value)
        assert '\n' not in value and '\r' not in value
        # Compose raw format preserves JWT JSON, dollar signs and quote characters.
        lines.append(f'{key}={value}')
    env_path = env_dir / f'{name}.env'
    env_path.write_text('\n'.join(lines) + '\n')
    env_path.chmod(0o600)
    service['env_file'] = [{'path': str(env_path), 'format': 'raw'}]
    service.pop('container_name', None)
    service.pop('networks', None)
    service['labels'] = {'traefik.enable': 'false'}
    for mount in service.get('volumes', []):
        if mount.get('type') == 'volume' and mount['target'] == '/etc/postgresql-custom':
            mount.clear()
            mount.update(type='bind', source=str(key_dir), target='/etc/postgresql-custom')
        if mount.get('type') == 'bind':
            assert Path(mount['source']).is_absolute()
            # Missing initialization files must fail deployment, not become folders.
            mount.setdefault('bind', {})['create_host_path'] = False
config.pop('name', None)
config.pop('networks', None)
config.pop('volumes', None)
output = root / 'coolify-compose.json'
output.write_text(json.dumps(config, indent=2) + '\n')
print('Secret-free Coolify definition written; credentials remain on the VPS.')
