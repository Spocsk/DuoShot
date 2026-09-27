#!/usr/bin/env python3
"""Provision via existing Mac SSH keys. Credentials stay in memory and SSH pipes."""
import json
from pathlib import Path
import shlex
import subprocess

SSH = ['ssh', '-o', 'BatchMode=yes', '-o', 'UseKeychain=yes', '-o', 'StrictHostKeyChecking=yes']
OLD = 'root@178.104.172.67'
NEW = 'root@178.104.185.75'


def remote(host, command, data=None):
    result = subprocess.run(SSH + [host, command], input=data, capture_output=True, check=True)
    return result.stdout


def put(host, path, data, mode=0o600):
    remote(host, f'umask 077; cat > {shlex.quote(path)} && chmod {mode:o} {shlex.quote(path)}', data)


values = {}
for line in remote(OLD, 'cat /etc/fail2ban/telegram.conf').decode().splitlines():
    tokens = shlex.split(line, comments=True)
    for token in tokens:
        if '=' in token:
            key, value = token.split('=', 1)
            if key in ('BOT_TOKEN', 'CHAT_ID'):
                values[key] = value
assert values.get('BOT_TOKEN') and values.get('CHAT_ID')
api_key = remote(NEW, 'docker exec web-i9qtpe5bpyig86s1aljxr5gv printenv NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY').decode().strip()
assert api_key
config = json.dumps({'bot_token': values['BOT_TOKEN'], 'chat_id': values['CHAT_ID'], 'api_anon_key': api_key}).encode()
base = Path(__file__).parent
for host in (OLD, NEW):
    remote(host, 'install -d -m 700 /etc/duoshot-security /opt/duoshot-security /var/lib/duoshot-security')
    put(host, '/etc/duoshot-security/monitor.json', config)
    for filename in ['monitor.py', 'install-monitor.py']:
        put(host, '/opt/duoshot-security/' + filename, (base / filename).read_bytes(), 0o700)

remote(OLD, 'test -f /etc/duoshot-security/probe-key || ssh-keygen -q -t ed25519 -N "" -C duoshot-external-backup-status -f /etc/duoshot-security/probe-key')
pub = remote(OLD, 'cat /etc/duoshot-security/probe-key.pub').decode().strip()
assert pub.startswith('ssh-ed25519 ')
authorization = 'from="178.104.172.67",restrict,command="/usr/local/sbin/duoshot-monitor backup-status" ' + pub
code = '''import sys
from pathlib import Path
p=Path('/root/.ssh/authorized_keys')
entry=sys.stdin.read().strip()
s=p.read_text()
if entry not in s.splitlines():
 p.write_text(s.rstrip()+'\\n'+entry+'\\n')
p.chmod(0o600)
'''
remote(NEW, 'python3 -c ' + shlex.quote(code), authorization.encode())
hostkey = remote(NEW, 'cat /etc/ssh/ssh_host_ed25519_key.pub').decode().split()
put(OLD, '/etc/duoshot-security/known_hosts', ('178.104.185.75 ' + ' '.join(hostkey[:2]) + '\n').encode())
print('Monitoring credentials and restricted probe key provisioned; no secrets emitted.')
