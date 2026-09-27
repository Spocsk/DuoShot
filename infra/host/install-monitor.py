#!/usr/bin/env python3
"""Install units after monitor.json and, on the probe, SSH material are provisioned."""
from pathlib import Path
import os
import shutil
import subprocess
import sys

mode = sys.argv[1]
assert mode in ('local', 'external') and os.geteuid() == 0
if mode == 'local':
    assert subprocess.check_output(['hostname'], text=True).strip() == 'duoshot-prod'
base = Path('/opt/duoshot-security')
assert Path('/etc/duoshot-security/monitor.json').stat().st_mode & 0o777 == 0o600
shutil.copyfile(base / 'monitor.py', '/usr/local/sbin/duoshot-monitor')
os.chmod('/usr/local/sbin/duoshot-monitor', 0o755)


def write(path, text, mode=0o644):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    p.chmod(mode)


unit = 'duoshot-monitor' if mode == 'local' else 'duoshot-external-probe'
for name, command in [(unit, mode), ('duoshot-alert-delivery', 'flush')]:
    write(f'/etc/systemd/system/{name}.service', f'''[Unit]
Description=DuoShot security {command}
After=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/duoshot-monitor {command}
TimeoutStartSec={'200' if command == 'flush' else '50'}
UMask=0077
Nice=10
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/duoshot-security
StateDirectory=duoshot-security
StateDirectoryMode=0700
''')
    write(f'/etc/systemd/system/{name}.timer', f'''[Unit]
Description=Run {name} every minute
[Timer]
OnCalendar=*-*-* *:*:00
RandomizedDelaySec={'10' if command == 'flush' else '2'}
Persistent=yes
[Install]
WantedBy=timers.target
''')

if mode == 'local':
    write('/etc/systemd/system/duoshot-alert@.service', '''[Unit]
Description=Queue a DuoShot service failure alert
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/duoshot-monitor event service %i
UMask=0077
''')
    for target in ['duoshot-backup.service', 'duoshot-maintenance@.service', 'duoshot-render-worker.service']:
        write(f'/etc/systemd/system/{target}.d/security-alert.conf', '[Unit]\nOnFailure=duoshot-alert@%n.service\n')
    write('/etc/fail2ban/jail.d/duoshot.local', '''[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 178.104.172.67
bantime = 1h
findtime = 10m
maxretry = 5
[sshd]
enabled = true
backend = systemd
port = 22
action = iptables-multiport[name=sshd, port="22", protocol=tcp]
         duoshot-telegram
''')
    write('/etc/fail2ban/action.d/duoshot-telegram.conf', '''[Definition]
actionban = /usr/local/sbin/duoshot-monitor event ban <ip>
actionunban =
actionstart =
actionstop =
actioncheck =
''')
    write('/etc/fail2ban/fail2ban.d/duoshot.local', '[Definition]\nallowipv6 = auto\n')
    subprocess.run(['fail2ban-client', '-t'], check=True)

subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemd-analyze', 'verify', f'/etc/systemd/system/{unit}.service', '/etc/systemd/system/duoshot-alert-delivery.service'], check=True)
subprocess.run(['systemctl', 'enable', '--now', unit + '.timer', 'duoshot-alert-delivery.timer'], check=True)
if mode == 'local':
    subprocess.run(['systemctl', 'enable', 'fail2ban'], check=True)
    subprocess.run(['systemctl', 'restart', 'fail2ban'], check=True)
subprocess.run(['systemctl', 'start', unit + '.service'], check=True)
