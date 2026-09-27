#!/usr/bin/env bash
# Run after copying this directory to /opt/duoshot-security; root on dedicated host only.
set -euo pipefail
[[ "$(id -u)" == 0 && "$(hostname)" == duoshot-prod ]] || exit 1
root=/opt/duoshot-security
backup="/root/duoshot-security-before-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$backup"
cp -a /etc/ufw "$backup/ufw"
cp -a /etc/ssh/sshd_config.d "$backup/sshd_config.d"
cp -a /data/coolify/proxy/docker-compose.yml "$backup/proxy.yml"
ufw status | head -1 > "$backup/ufw-state"
cat > "$backup/rollback.sh" <<'EOF'
#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
rm -f /etc/systemd/system/docker.service.d/duoshot-firewall.conf
systemctl disable --now duoshot-firewall.service || true
ufw --force disable
for tool in iptables ip6tables; do
  while "$tool" -w -C DOCKER-USER -j DUOSHOT-INGRESS 2>/dev/null; do "$tool" -w -D DOCKER-USER -j DUOSHOT-INGRESS; done
  "$tool" -w -F DUOSHOT-INGRESS 2>/dev/null || true
  "$tool" -w -X DUOSHOT-INGRESS 2>/dev/null || true
done
cp -a ufw/. /etc/ufw/
rm -f /etc/ssh/sshd_config.d/00-duoshot-security.conf
cp -a sshd_config.d/. /etc/ssh/sshd_config.d/
/usr/sbin/sshd -t && systemctl reload ssh
if grep -qx 'Status: active' ufw-state; then ufw --force enable; fi
systemctl daemon-reload
echo 'DuoShot local network/SSH rollback completed.'
EOF
chmod 700 "$backup/rollback.sh"
systemd-run --unit=duoshot-security-rollback --on-active=10m "$backup/rollback.sh"
printf '%s\n' "$backup" > /root/duoshot-security-latest-backup
install -m 755 "$root/docker-firewall.sh" /usr/local/sbin/duoshot-docker-firewall
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/duoshot-firewall.conf <<'EOF'
[Service]
ExecStartPost=/usr/local/sbin/duoshot-docker-firewall
EOF
cat > /etc/systemd/system/duoshot-firewall.service <<'EOF'
[Unit]
Description=DuoShot Docker ingress policy
After=docker.service ufw.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/duoshot-docker-firewall
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/ufw/after.init <<'EOF'
#!/bin/sh
case "$1" in
start) /usr/local/sbin/duoshot-docker-firewall ;;
esac
exit 0
EOF
chmod 755 /etc/ufw/after.init
cat > /etc/ssh/sshd_config.d/00-duoshot-security.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
X11Forwarding no
EOF
/usr/sbin/sshd -t
# Add allow rules BEFORE activating the default-deny policy.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw default deny incoming
ufw default allow outgoing
ufw default deny routed
ufw logging low
systemctl daemon-reload
systemctl enable --now duoshot-firewall.service
ufw --force enable
systemctl reload ssh
cat > /etc/apt/apt.conf.d/52duoshot-security <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
echo "Validate NEW SSH sessions, Coolify and HTTPS, then cancel duoshot-security-rollback.timer. Backup: $backup"
