#!/usr/bin/env python3
"""Run on the private target; synthetic data only, secrets never printed."""
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import uuid

config = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines()
              if line and not line.startswith('#') and '=' in line)
base = 'http://127.0.0.1:8000'
key = config['SUPABASE_SECRET_KEY']
bucket = 'migration-smoke-' + uuid.uuid4().hex


def request(method, path, data=None, admin=True, content_type='application/json'):
    headers = {'Content-Type': content_type}
    if admin:
        headers['apikey'] = key
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def expect(status, result, label):
    assert result[0] == status, f'{label}: expected {status}, got {result[0]}'
    print(label + ': OK')
    return result[1]


expect(200, request('GET', '/auth/v1/health'), 'Auth health')
expect(200, request('GET', '/rest/v1/'), 'REST authenticated')
expect(401, request('GET', '/rest/v1/', admin=False), 'REST rejects missing API key')
settings = json.loads(expect(200, request('GET', '/auth/v1/settings'), 'Auth settings'))
assert settings['disable_signup'] is True, 'Signup must remain disabled'
print('Signup disabled: OK')
expect(200, request('POST', '/storage/v1/bucket', json.dumps({
    'id': bucket, 'name': bucket, 'public': False,
    'file_size_limit': 104857600,
}).encode()), 'Create private synthetic bucket')
try:
    # Exceeds Supabase Cloud's previous 50 MiB project cap.
    content = os.urandom(60 * 1024 * 1024)
    digest = hashlib.sha256(content).digest()
    expect(200, request('POST', f'/storage/v1/object/{bucket}/test.bin', content,
                        content_type='application/octet-stream'), 'Upload 60 MiB')
    del content
    signed = json.loads(expect(200, request('POST', f'/storage/v1/object/sign/{bucket}/test.bin',
                                            b'{"expiresIn":60}'), 'Sign private object'))
    downloaded = expect(200, request('GET', '/storage/v1' + signed['signedURL'], admin=False),
                        'Download with signed URL')
    assert hashlib.sha256(downloaded).digest() == digest, 'Downloaded bytes differ'
    del downloaded
    print('SHA-256 round trip: OK')
    assert request('GET', f'/storage/v1/object/public/{bucket}/test.bin', admin=False)[0] != 200
    assert request('GET', f'/storage/v1/object/{bucket}/test.bin', admin=False)[0] != 200
    print('Anonymous/public access denied: OK')
finally:
    expect(200, request('DELETE', f'/storage/v1/object/{bucket}', b'{"prefixes":["test.bin"]}'),
           'Remove synthetic object')
    expect(200, request('DELETE', f'/storage/v1/bucket/{bucket}'), 'Remove synthetic bucket')
