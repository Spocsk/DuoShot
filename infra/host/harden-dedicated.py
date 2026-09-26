#!/usr/bin/env python3
"""Dedicated host only. Preserve real NIC hotplug and require existing SSH keys."""
from pathlib import Path
import subprocess

rule = Path('/etc/udev/rules.d/90-cloud-init-hook-hotplug.rules')
content = rule.read_text()
guard = 'DEVPATH=="/devices/virtual/net/*", GOTO="cloudinit_end"'
assert 'LABEL="cloudinit_end"' in content
if guard not in content:
    Path(str(rule) + '.duoshot-backup').write_text(content)
    rule.write_text(content.replace('ACTION!="add", GOTO="cloudinit_end"', 'ACTION!="add", GOTO="cloudinit_end"\n' + guard))
    assert guard in rule.read_text()
subprocess.run(['udevadm', 'control', '--reload-rules'], check=True)
subprocess.run(['systemctl', 'reset-failed', 'cloud-init-hotplugd.service'], check=True)

ssh = Path('/etc/ssh/sshd_config.d/00-duoshot-key-only.conf')
ssh.write_text('PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n')
subprocess.run(['/usr/sbin/sshd', '-t'], check=True)
subprocess.run(['systemctl', 'reload', 'ssh'], check=True)
print('Virtual NIC hotplug excluded; SSH key-only policy applied. Verify a new SSH connection.')
