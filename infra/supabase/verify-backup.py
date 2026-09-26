#!/usr/bin/env python3
"""Decrypt on the Mac, restore into an isolated DB on the VPS, then remove it.

Usage: verify-backup.py archive.age identity.age root@host db-container
The identity never leaves the Mac. No production database is overwritten.
"""
import io
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tarfile
import uuid

archive, identity, host, container = sys.argv[1:]
plain = subprocess.check_output(['age', '--decrypt', '-i', identity, archive])
with tarfile.open(fileobj=io.BytesIO(plain), mode='r:gz') as tar:
    names = tar.getnames()
    assert all(name in names for name in ['./postgres.dump', './roles.sql', '.env', './manifest.json'])
    assert any(name.startswith('volumes/db/config/') for name in names)
    assert 'volumes/storage' in names
    assert json.load(tar.extractfile('./manifest.json'))['offline'] is True
    dump = tar.extractfile('./postgres.dump').read()
print('Backup authenticated; database, roles, Storage and keys present.')
ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'UseKeychain=yes', host]
db = 'duoshot_restore_' + uuid.uuid4().hex[:12]


def command(*args, data=None):
    return subprocess.run(ssh + [shlex.join(args)], input=data, capture_output=True)


# Extension-owned vault tables require the real self-hosted superuser.
result = command('docker', 'exec', container, 'createdb', '-U', 'supabase_admin', '-T', 'template0', db)
if result.returncode:
    raise SystemExit('Could not create the isolated restore database.')
try:
    result = command('docker', 'exec', '-i', container, 'pg_restore', '-U', 'supabase_admin',
                     '--no-owner', '--no-privileges', '--exit-on-error', '-d', db, data=dump)
    if result.returncode:
        diagnostic = Path(archive).with_suffix('.restore-error.log')
        diagnostic.touch(mode=0o600, exist_ok=True)
        diagnostic.write_bytes(result.stderr)
        raise SystemExit('Restore failed; diagnostic stored privately beside the archive.')
    result = command('docker', 'exec', container, 'psql', '-U', 'supabase_admin', '-d', db, '-Atc',
                     "select count(*) from information_schema.tables where table_schema in ('auth','storage');")
    assert result.returncode == 0 and int(result.stdout.strip()) > 0
    print('Actual database restore succeeded; auth/storage schemas verified.')
finally:
    result = command('docker', 'exec', container, 'dropdb', '-U', 'supabase_admin', db)
    if result.returncode:
        raise SystemExit('Temporary restore database cleanup failed: ' + db)
print('Temporary database removed; original database unchanged.')
