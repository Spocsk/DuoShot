#!/usr/bin/env python3
"""Small root-owned monitor. No credentials, raw logs or response bodies in alerts."""
import argparse
import contextlib
import fcntl
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

CONFIG = Path('/etc/duoshot-security/monitor.json')
STATE = Path('/var/lib/duoshot-security')
CONTAINERS = ['coolify-proxy', 'coolify-sentinel', 'web-i9qtpe5bpyig86s1aljxr5gv'] + [
    f'{name}-5if8qfnj7o1bi2lrd3nbncff' for name in ['db', 'auth', 'rest', 'storage', 'api-gw']]


def run(args, timeout=15):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True).stdout.strip()


def atomic(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value))
    tmp.chmod(0o600)
    tmp.replace(path)


@contextlib.contextmanager
def state():
    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (STATE / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = STATE / 'state.json'
        data = json.loads(path.read_text()) if path.exists() else {}
        data.setdefault('incidents', {})
        data.setdefault('outbox', [])
        yield data
        atomic(path, data)


def enqueue(data, message, now):
    # Bounded storage even when Telegram is down. Log overflow without message data.
    if len(data['outbox']) >= 2000:
        print('Alert queue full; dropping oldest pending delivery', flush=True)
        data['outbox'].pop(0)
    data['outbox'].append({'id': os.urandom(12).hex(), 'text': message, 'created': now})


def incident(data, key, severity, message, now, samples=1, delay=0):
    item = data['incidents'].setdefault(key, {'count': 0, 'notified': False})
    if not severity:
        if item['notified']:
            enqueue(data, f'[DuoShot] RÉTABLI — {message}', now)
        data['incidents'].pop(key, None)
        return
    if not item['count']:
        item['since'] = now
    item['count'] += 1
    if item['count'] < samples or now - item['since'] < delay:
        return
    if not item['notified'] or item.get('severity') != severity or now - item.get('last', 0) >= 3600:
        enqueue(data, f'[DuoShot] {severity.upper()} — {message}', now)
        item.update(notified=True, severity=severity, last=now)


def threshold(percent):
    return 'critique' if percent >= 90 else 'attention' if percent >= 80 else ''


def backup_status():
    raw = run(['systemctl', 'show', 'duoshot-backup.service', '-p', 'ActiveState', '-p', 'ActiveEnterTimestampMonotonic', '-p', 'InactiveExitTimestampMonotonic'])
    fields = dict(line.split('=', 1) for line in raw.splitlines())
    active = fields['ActiveState'] in ('active', 'activating', 'deactivating')
    start = int(fields.get('InactiveExitTimestampMonotonic', '0')) / 1e6
    age = max(0, float(Path('/proc/uptime').read_text().split()[0]) - start) if active else 0
    return {'active': active, 'seconds': round(age)}


def http_ok(url, key=None, health_json=False):
    headers = {'User-Agent': 'DuoShot-security-monitor/1'}
    if key:
        headers['apikey'] = key
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=8) as response:
            if response.status != 200:
                return False
            body = json.loads(response.read(16384)) if health_json else None
            return body.get('status') == 'ok' if health_json else True
    except (OSError, ValueError, urllib.error.URLError):
        return False


def ssh_successes(data, now):
    args = ['journalctl', '-u', 'ssh.service', '-o', 'json', '--no-pager', '-n', '1000']
    if data.get('ssh_cursor'):
        args += ['--after-cursor', data['ssh_cursor']]
    else:
        args += ['--since', '-2 minutes']
    try:
        output = run(args)
    except subprocess.CalledProcessError:
        output = run(['journalctl', '-u', 'ssh.service', '-o', 'json', '--no-pager', '--since', '-2 minutes', '-n', '1000'])
    for line in output.splitlines():
        row = json.loads(line)
        data['ssh_cursor'] = row['__CURSOR']
        match = re.search(r'^Accepted publickey for ([a-zA-Z0-9_-]+) from ([0-9a-fA-F:.]+) port ', row.get('MESSAGE', ''))
        if not match:
            continue
        user, address = match.groups()
        ipaddress.ip_address(address)
        # Coolify's frequent automation is grouped; human connections remain per event.
        if address == '178.104.172.67':
            group = data.setdefault('automation_ssh', {'last': now, 'count': 0})
            group['count'] += 1
            if now - group['last'] >= 3600:
                enqueue(data, f'[DuoShot] SSH — {group["count"]} connexions automatisées depuis le serveur Coolify en une heure.', now)
                group.update(last=now, count=0)
        else:
            enqueue(data, f'[DuoShot] SSH — connexion par clé de {user}, origine {address}.', now)


def local(data, config, now):
    maintenance = backup_status()
    suppress = maintenance['active'] and maintenance['seconds'] <= 300
    incident(data, 'backup-duration', 'critique' if maintenance['active'] and maintenance['seconds'] > 300 else '', 'Sauvegarde active depuis plus de cinq minutes', now)
    raw = run(['docker', 'ps', '-a', '--format', '{{.Names}}|{{.State}}|{{.Status}}'])
    containers = {parts[0]: parts[1:] for line in raw.splitlines() if len(parts := line.split('|', 2)) == 3}
    for name in CONTAINERS:
        status = containers.get(name, ['', ''])
        bad = status[0] != 'running' or ('(healthy)' not in status[1])
        if suppress:
            if not data['incidents'].get('container:' + name, {}).get('notified'):
                data['incidents'].pop('container:' + name, None)
            continue
        incident(data, 'container:' + name, 'critique' if bad else '', f'Conteneur {name}', now, samples=3)
    fs = os.statvfs('/')
    for name, used in [('Disque', 100 * (1 - fs.f_bavail / fs.f_blocks)), ('Inodes', 100 * (1 - fs.f_favail / fs.f_files))]:
        incident(data, name, threshold(used), f'{name} racine : {used:.0f} % utilisés', now)
    mem = dict((k.rstrip(':'), int(v.split()[0])) for k, v in (line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines()))
    available = mem['MemAvailable'] / mem['MemTotal']
    incident(data, 'memory', 'critique' if available < .1 else '', f'Mémoire disponible : {available:.0%}', now, delay=300)
    marker = Path('/data/duoshot/backup-last-success')
    stale = not marker.exists() or now - marker.stat().st_mtime > 26 * 3600
    incident(data, 'backup-age', 'critique' if stale else '', 'Fraîcheur de la sauvegarde chiffrée vérifiée hors hôte (limite 26 h)', now)
    for unit in ['duoshot-backup.service', 'duoshot-maintenance@storage.service', 'duoshot-maintenance@analytics.service', 'duoshot-render-worker.service']:
        fields = dict(line.split('=', 1) for line in run(['systemctl', 'show', unit, '-p', 'ActiveState', '-p', 'Result', '-p', 'NRestarts']).splitlines())
        bad = fields.get('Result') != 'success' or fields['ActiveState'] == 'failed'
        if unit == 'duoshot-render-worker.service':
            bad |= fields['ActiveState'] != 'active'
            restarts = int(fields.get('NRestarts', '0'))
            history = data.setdefault('worker_restarts', [])
            history.append([now, restarts])
            history[:] = [sample for sample in history if now - sample[0] <= 300]
            bad |= restarts - history[0][1] >= 3
            if suppress:
                continue
        incident(data, 'service:' + unit, 'critique' if bad else '', f'Service {unit}', now, samples=3 if 'worker' in unit else 1)
    ssh_successes(data, now)


def external(data, config, now):
    checks = [('web', http_ok('https://duoshot.site/api/health', health_json=True)),
              ('api', http_ok('https://api.duoshot.site/auth/v1/health', config['api_anon_key']))]
    suppress = False
    if not all(ok for _, ok in checks):
        try:
            remote = json.loads(run(['ssh', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=4', '-o', 'UserKnownHostsFile=/etc/duoshot-security/known_hosts', '-i', '/etc/duoshot-security/probe-key', 'root@178.104.185.75'], timeout=7))
            suppress = remote['active'] and 0 <= remote['seconds'] <= 300
            incident(data, 'remote-backup-duration', 'critique' if remote['active'] and remote['seconds'] > 300 else '', 'Sauvegarde DuoShot dépassant cinq minutes (sonde externe)', now)
        except (OSError, ValueError, subprocess.SubprocessError, KeyError):
            # Never hide a failure if the maintenance state cannot be verified.
            pass
    else:
        incident(data, 'remote-backup-duration', '', 'Sauvegarde DuoShot : services publics disponibles', now)
    for name, ok in checks:
        if suppress and not ok:
            if not data['incidents'].get('https:' + name, {}).get('notified'):
                data['incidents'].pop('https:' + name, None)
            continue
        incident(data, 'https:' + name, '' if ok else 'critique', f'HTTPS public DuoShot : {name}', now, samples=3)


def flush(config):
    # Only the sender makes network calls; event producers never wait for Telegram.
    with state() as data:
        pending = list(data['outbox'][:20])
    for item in pending:
        payload = urllib.parse.urlencode({'chat_id': config['chat_id'], 'text': item['text'], 'disable_web_page_preview': 'true'}).encode()
        request = urllib.request.Request('https://api.telegram.org/bot' + config['bot_token'] + '/sendMessage', data=payload)
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                if not json.load(response).get('ok'):
                    raise ValueError('delivery rejected')
        except Exception as exc:
            # Exception messages may contain the credential-bearing URL.
            print('Telegram delivery pending: ' + type(exc).__name__, flush=True)
            return
        with state() as data:
            data['outbox'] = [entry for entry in data['outbox'] if entry['id'] != item['id']]
        print('Telegram delivery accepted: ' + item['id'], flush=True)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['local', 'external', 'flush', 'event', 'backup-status'])
    parser.add_argument('kind', nargs='?', choices=['ban', 'service', 'test'])
    parser.add_argument('value', nargs='?', default='')
    args = parser.parse_args()
    if args.mode == 'backup-status':
        print(json.dumps(backup_status()))
        return
    config = json.loads(CONFIG.read_text())
    if args.mode == 'flush':
        flush(config)
        return
    now = time.time()
    with state() as data:
        if args.mode in ('local', 'external'):
            try:
                (local if args.mode == 'local' else external)(data, config, now)
                incident(data, 'monitor-error', '', 'Exécution de la surveillance ' + args.mode, now)
            except Exception as exc:
                incident(data, 'monitor-error', 'critique', 'Échec surveillance ' + args.mode + ' (' + type(exc).__name__ + ')', now)
                print('Monitor check failed: ' + type(exc).__name__, flush=True)
        elif args.kind == 'ban':
            ip = ipaddress.ip_address(args.value)
            test = ' [TEST]' if ip in ipaddress.ip_network('192.0.2.0/24') or ip.version == 6 and ip in ipaddress.ip_network('2001:db8::/32') else ''
            enqueue(data, f'[DuoShot]{test} Fail2ban — adresse {ip} bannie sur SSH pour une heure.', now)
        elif args.kind == 'service':
            if not re.fullmatch(r'duoshot-[a-zA-Z0-9@_.:-]+', args.value):
                raise ValueError('Invalid unit name')
            incident(data, 'service:' + args.value, 'critique', 'Service ' + args.value, now)
        elif args.kind == 'test':
            enqueue(data, '[DuoShot] TEST — alertes Telegram opérationnelles depuis ' + socket.gethostname() + '.', now)
        else:
            raise ValueError('Event kind required')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Security monitor failure: ' + type(error).__name__, flush=True)
        raise SystemExit(1)
