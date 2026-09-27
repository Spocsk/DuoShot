#!/usr/bin/env bash
# Dedicated DuoShot host. Preserve Docker-owned chains and east-west traffic.
set -euo pipefail
[[ "$(hostname)" == duoshot-prod ]] || { echo 'Wrong host' >&2; exit 1; }
exec 9>/run/duoshot-firewall.lock
flock 9
nic="$(ip -4 route show default | awk 'NR==1 {print $5}')"
[[ "$nic" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 1
for tool in iptables ip6tables; do
  "$tool" -w -N DOCKER-USER 2>/dev/null || "$tool" -w -S DOCKER-USER >/dev/null
  # --noflush replaces only our chain, atomically, without opening a reload gap.
  "$tool-restore" --wait --noflush <<EOF
*filter
:DUOSHOT-INGRESS - [0:0]
-F DUOSHOT-INGRESS
-A DUOSHOT-INGRESS -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DUOSHOT-INGRESS ! -i $nic -j RETURN
-A DUOSHOT-INGRESS -p tcp -m conntrack --ctorigdstport 80 -j RETURN
-A DUOSHOT-INGRESS -p tcp -m conntrack --ctorigdstport 443 -j RETURN
-A DUOSHOT-INGRESS -p udp -m conntrack --ctorigdstport 443 -j RETURN
-A DUOSHOT-INGRESS -j DROP
COMMIT
EOF
  "$tool" -w -C DOCKER-USER -j DUOSHOT-INGRESS 2>/dev/null || "$tool" -w -I DOCKER-USER 1 -j DUOSHOT-INGRESS
  "$tool" -w -C FORWARD -j DOCKER-USER 2>/dev/null || "$tool" -w -I FORWARD 1 -j DOCKER-USER
done
