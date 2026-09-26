#!/usr/bin/env python3
"""Forced SSH command: accept age archives into one folder, with bounded disk use.
Usage in authorized_keys: command=\"python3 /path/receive-backup.py /backup/folder\"
The sender provides: store <UTC timestamp>.tar.gz.age <sha256> <bytes>
"""
import hashlib
import os
from pathlib import Path
import re
import shlex
import shutil
import sys
import tempfile

root = Path(sys.argv[1]).resolve()
args = shlex.split(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
pattern = r'\d{8}T\d{6}Z\.tar\.gz\.age'
if len(args) != 4 or args[0] != 'store' or not re.fullmatch(pattern, args[1]) or not re.fullmatch(r'[0-9a-f]{64}', args[2]):
    raise SystemExit('Unsupported backup request.')
name, expected_hash = args[1:3]
size = int(args[3])
if not 0 < size <= 5 * 1024**3:
    raise SystemExit('Archive exceeds the 5 GiB receiver limit.')
root.mkdir(mode=0o700, parents=True, exist_ok=True)
if shutil.disk_usage(root).free < size + 2 * 1024**3:
    raise SystemExit('Insufficient backup disk space; existing backups preserved.')
fd, temporary = tempfile.mkstemp(prefix='.incoming-', dir=root)
try:
    digest = hashlib.sha256()
    received = 0
    with os.fdopen(fd, 'wb') as target:
        while chunk := sys.stdin.buffer.read(1024 * 1024):
            if received == 0 and not chunk.startswith(b'age-encryption.org/v1\n'):
                raise SystemExit('Expected an age encrypted archive.')
            received += len(chunk)
            if received > size:
                raise SystemExit('Archive size mismatch.')
            target.write(chunk)
            digest.update(chunk)
        target.flush()
        os.fsync(target.fileno())
    if received != size or digest.hexdigest() != expected_hash:
        raise SystemExit('Archive digest mismatch.')
    destination = root / name
    if destination.exists():
        with destination.open('rb') as existing:
            if hashlib.file_digest(existing, 'sha256').hexdigest() != expected_hash:
                raise SystemExit('Refusing to replace a different archive.')
        Path(temporary).unlink()
    else:
        os.replace(temporary, destination)
    # Rotate only our timestamped archives, after a new copy has been verified.
    archives = sorted(p for p in root.iterdir() if re.fullmatch(pattern, p.name) and p.is_file())
    for old in archives[:-7]:
        old.unlink()
    print(f'STORED {expected_hash} {name}')
finally:
    Path(temporary).unlink(missing_ok=True)
