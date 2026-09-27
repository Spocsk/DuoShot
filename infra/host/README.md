# Sécurité du VPS DuoShot

État appliqué et vérifié le **27 septembre 2026** sur `duoshot-prod`
(`178.104.185.75`, IPv6 `2a01:4f8:c012:35e5::1`).

## Réseau et accès

- [Firewall Hetzner dédié](https://console.hetzner.com/projects/14294568/firewalls/11688282/rules) : cinq règles, TCP 22/80/443, UDP 443 et ICMP, toutes sources IPv4/IPv6 ; sorties autorisées. Appliqué uniquement au serveur `167542515`.
- Le firewall historique `10872765` conserve ses quatre règles et seulement l'ancien VPS. DuoShot en est détaché : les règles de plusieurs firewalls Hetzner s'additionnent, il ne faut pas conserver une exception indésirable sur un second firewall.
- UFW actif : entrées et trafic routé refusés par défaut, sorties autorisées ; ports ci-dessus autorisés, ICMP utile et découverte IPv6 conservés dans les règles UFW standards.
- `docker-firewall.sh` gère uniquement `DUOSHOT-INGRESS` et son raccordement à `DOCKER-USER`, dans les deux familles IP. Il laisse les flux établis et les communications internes à Docker ; seuls HTTP/HTTPS/HTTP3 peuvent entrer depuis l'interface publique. Les ports sont comparés avant traduction NAT via conntrack.
- Réapplication au démarrage de Docker (`ExecStartPost`), au démarrage système (`duoshot-firewall.service`) et lors d'un rechargement UFW (`after.init`). Les chaînes Docker ne sont pas remplacées.
- SSH reste public sur 22, par clés uniquement, root autorisé par clé ; mots de passe, mots de passe vides et X11 désactivés. La clé Coolify reste limitée à `178.104.172.67`.
- Fail2ban SSH : backend systemd, cinq échecs en dix minutes, bannissement d'une heure ; localhost et l'ancien VPS exemptés. Action iptables/ip6tables placée avant les règles UFW.
- Le proxy ne publie plus 8080. PostgreSQL n'a aucun port publié ; application 3000 et API 8000 restent sur localhost.
- Mises à jour de sécurité Ubuntu automatiques ; redémarrage automatique désactivé explicitement.

La configuration persistante du proxy est enregistrée **dans Coolify et sur le VPS** via `SaveProxyConfiguration`. `harden-coolify-proxy.php` applique la suppression de 8080 et conserve les réseaux applicatifs externes `5if8qfnj7o1bi2lrd3nbncff` et `i9qtpe5bpyig86s1aljxr5gv`. Un simple changement de fichier distant ne suffit pas à préserver la configuration administrée par Coolify.

## Alertes

`monitor.py` est installé sur les deux serveurs sous `/usr/local/sbin/duoshot-monitor`.
Configuration root-only : `/etc/duoshot-security/monitor.json` (0600), secrets issus du bot existant ; état, curseur du journal, incidents et file de livraison : `/var/lib/duoshot-security` (0700). Aucun secret dans le dépôt.

Sur DuoShot, `duoshot-monitor.timer` contrôle chaque minute :

- les huit conteneurs attendus, après trois contrôles consécutifs en anomalie ;
- disque et inodes de la racine à 80 %, puis 90 % ;
- mémoire disponible sous 10 % pendant cinq minutes ;
- sauvegarde vérifiée hors hôte de plus de 26 heures, d'après le mtime du marqueur de réussite écrit **après** accusé de réception distant ;
- échecs des sauvegardes et maintenances, worker indisponible ou au moins trois redémarrages en cinq minutes ;
- connexions SSH réussies, sans journal brut : connexions humaines individuellement, connexions automatisées depuis Coolify regroupées par heure.

Les unités sauvegarde, maintenance et worker possèdent aussi un `OnFailure` qui place immédiatement un incident en file. L'action Fail2ban place les bannissements dans cette même file, sans attendre le réseau Telegram.

Sur l'ancien VPS, `duoshot-external-probe.timer` contrôle chaque minute `https://duoshot.site/api/health` (HTTP 200 et JSON `status=ok`) et `https://api.duoshot.site/auth/v1/health` (HTTP 200 avec la clé publique applicative). Trois échecs consécutifs déclenchent une alerte, puis un rétablissement est envoyé.

En cas d'indisponibilité, la sonde vérifie l'activité réelle de la sauvegarde par une clé SSH dédiée. Celle-ci est restreinte à l'IP de l'ancien VPS, sans forwarding ni shell, et forcée à la commande `duoshot-monitor backup-status`. La clé hôte est épinglée. Une sauvegarde active peut masquer jusqu'à cinq minutes d'indisponibilité ; un dépassement est signalé immédiatement. Un état inconnu ne masque jamais une panne.

`duoshot-alert-delivery.timer` livre la file chaque minute : déduplication par incident, rappel horaire, notification au rétablissement. En cas d'échec Telegram, conservation et nouvelle tentative ; les exceptions sont journalisées par type, sans URL contenant le token. Livraison au moins une fois : un arrêt après réception Telegram mais avant validation locale peut produire un doublon. File bornée à 2 000 messages, abandon du plus ancien avec journalisation si saturation prolongée.

## Exploitation et récupération

Commandes sur DuoShot :

```sh
ufw status verbose
fail2ban-client status sshd
fail2ban-client set sshd unbanip ADRESSE_IP
systemctl list-timers 'duoshot-*'
journalctl -u duoshot-monitor.service -u duoshot-alert-delivery.service --since '-1 hour'
systemctl show duoshot-backup.service -p Result -p OnFailure
/usr/local/sbin/duoshot-monitor event test
systemctl start duoshot-alert-delivery.service
```

Sur l'ancien VPS, consulter `duoshot-external-probe.service` et `duoshot-alert-delivery.service`. Ne pas afficher les fichiers de configuration privés, les environnements complets ou l'état contenant des adresses de connexion dans des journaux publics.

L'installation réseau initiale est `configure-security.sh`, réservée au serveur nommé `duoshot-prod`. Elle sauvegarde UFW, SSH et la configuration du proxy sous `/root/duoshot-security-before-<date>` et arme un retour arrière à dix minutes. Le chemin courant est dans `/root/duoshot-security-latest-backup`. Une session SSH reste ouverte pendant l'opération. N'annuler le timer `duoshot-security-rollback.timer` qu'après une **nouvelle** connexion SSH, un accès par la clé Coolify et les contrôles HTTPS.

Le script `rollback.sh` de cette sauvegarde restaure les règles locales et SSH de l'état initial. Il ne modifie pas Hetzner et ne recrée pas le proxy. Pour récupérer un accès après erreur ultérieure, utiliser la console Hetzner, rétablir d'abord TCP 22 dans le firewall cloud, puis débannir l'adresse ou restaurer la configuration locale. Éviter de restaurer l'ancien Compose du proxy tel quel : il ne persistait pas les réseaux applicatifs.

Pour réinstaller la surveillance depuis le Mac : `python3 infra/host/provision-monitor.py` transfère uniquement les identifiants nécessaires via SSH et prépare la clé restreinte. Puis exécuter `python3 /opt/duoshot-security/install-monitor.py local` sur DuoShot et le même programme avec `external` sur l'ancien VPS. Ces scripts sont spécifiques aux ressources actuelles ; réconcilier les noms si Coolify recrée les services.

## Validation et limites

- Nouvelles sessions SSH depuis le Mac et avec la clé Coolify de l'ancien VPS réussies après activation du firewall.
- Depuis l'ancien VPS, TCP 22/80/443 accessibles en IPv4 **et IPv6** ; 3000/5432/8000/8080 inaccessibles. HTTPS IPv6 forcé vers le domaine : certificat validé et santé HTTP 200. Pas d'AAAA public ajouté.
- Rechargement réel UFW : filtrage Docker et Fail2ban conservés, santé HTTP 200. Persistance systemd vérifiée sans redémarrage complet du serveur.
- Fail2ban : dix lignes synthétiques IPv4/IPv6 reconnues sur dix ; bannissement et débannissement effectifs de `192.0.2.123` et `2001:db8::123`, règles des deux familles vérifiées. Aucun accès réel banni par le test.
- Telegram : messages de test des deux hôtes et notifications de bannissement acceptés par l'API. Une unité temporaire en échec a déclenché `OnFailure`, puis un rétablissement a été placé en file ; unité de test réinitialisée.
- Six tests isolés couvrent les échecs consécutifs, rétablissements, rappels, seuils, cinq minutes de mémoire faible, maintenance réelle/inconnue et reprise de livraison sans fuite de token. Exécution : `python3 -m unittest discover -s infra/host -p 'test_*.py' -v`.
- Incident pendant l'installation : la première recréation du proxy a perdu les raccordements réseau précédemment ajoutés manuellement, causant une interruption HTTP de quelques minutes. Raccordements restaurés, puis persistés dans Coolify ; la sonde externe a détecté l'incident et son rétablissement. Les services applicatifs et la base n'ont pas été redémarrés pour cette correction.
- UDP 443 est autorisé et publié pour HTTP/3 ; aucun test client QUIC complet effectué. Une panne simultanée des deux VPS ou de Telegram n'est pas couverte par une troisième destination. La réception API Telegram n'atteste pas de la lecture des notifications sur le téléphone.
- Sauvegardes existantes conservées : la surveillance de fraîcheur ne remplace pas un exercice complet de restauration. Aucun redémarrage général, migration applicative ou abonnement supplémentaire.
- Contrôle final : aucun service systemd en échec sur DuoShot, aucun incident actif ni livraison en attente sur les deux sondes. Archive `20260927T030114Z.tar.gz.age` présente sur les deux VPS, SHA-256 identique. Les scripts de surveillance déployés sur les deux hôtes correspondent au fichier du dépôt.
