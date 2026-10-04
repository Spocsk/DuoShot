# Mise en production sur le VPS — 26 septembre 2026

## Décision et état public

L’utilisateur a explicitement demandé de basculer immédiatement sur la base neuve du VPS, en indiquant qu’il n’y avait pas d’utilisateurs à conserver pour le lancement. Les anciens comptes, données et fichiers Supabase Cloud sont conservés ; aucun import ni aucune suppression source n’a été effectué. Vercel et Supabase Cloud ne sont pas résiliés.

`duoshot.site` et `www.duoshot.site` pointent désormais vers `178.104.185.75`. Le domaine et ses serveurs DNS restent chez Vercel. L’API `api.duoshot.site` utilise déjà ce VPS. Les enregistrements d’envoi Resend et de vérification Google sont préservés.

- DNS apex : `rec_8260f5ac83a0c94f97cba85a`, A, TTL 60 secondes.
- DNS www : `rec_b80d89436188bbe5239c3fbf`, A, TTL 60 secondes.
- Certificats Let's Encrypt valides pour les deux domaines ; HTTP redirige vers HTTPS. Vérification effectuée sans désactiver la validation TLS.
- Service Coolify `duoshot-web`, activité 173, image `ghcr.io/spocsk/duoshot:919b630b042d08d6599db53e99bc1fd3b39429e9`. Ce commit contient la dernière version applicative de `main` au moment de la bascule. Build GitHub Actions `36269882151` réussi ; CI du commit `36269511653` réussie.
- Routage Traefik vers le port interne 3000 ; le port hôte 3000 reste limité à 127.0.0.1. PostgreSQL reste privé.
- Google et inscriptions activés ; confirmation email obligatoire. SMTP Resend en place.
- `APP_ENV=production`. Checkout et paiements live restent désactivés jusqu’à validation Stripe. L’API publique de disponibilité renvoie `checkoutAvailable: false`.

## Ancien hébergement

Le projet Vercel sert une page statique de maintenance avec HTTP 503, `Cache-Control: no-store` et `Retry-After: 120`, y compris sur ses anciennes routes API. Déploiement `dpl_4PSMmy2y3Vhmckh2iFiKqxr3udHw`. Il couvre les visiteurs dont la résolution DNS pointe encore vers Vercel. Aucun nouveau cron Vercel n’est installé.

Les anciens déploiements historiques et Supabase Cloud sont conservés. La page de maintenance ne révoque pas les sessions Supabase Cloud déjà émises. Ne pas rouvrir l’ancien front ni repointer les DNS vers l’ancienne base sans réconcilier les nouvelles écritures du VPS.

## Vérifications

- DNS autoritaire Vercel et résolveurs publics Cloudflare/Google : nouvelle IPv4 confirmée. Aucun AAAA apex concurrent.
- Depuis le VPS, les deux domaines répondent en HTTPS : `/api/health`, `/login`, `/forgot-password`, `/pricing`, `/sitemap.xml`, `/api/billing/availability` renvoient HTTP 200.
- Accueil français : `lang=fr`, nouvelle page « DuoShot — captures iPhone Duo pour l’App Store », canonical `https://duoshot.site`.
- Recette réelle avant ouverture des inscriptions : ZIP de vingt images, 43 066 265 octets, CRC valide, rendu en 21 149 ms ; idempotence et remboursement d’un rendu échoué validés. Isolation entre utilisateurs et révocation des reviews validées. Un rendu supplémentaire réussi, sept sondes de santé sans erreur. Deux comptes synthétiques et leurs fichiers supprimés.
- L’image de cette recette et le commit final de main ont le même code applicatif ; leur différence concerne uniquement la documentation de validation.
- Après ouverture et déploiement final : conteneur sain, configuration Auth vérifiée par l’API (inscriptions ouvertes, Google activé, confirmation email requise).
- Sauvegarde finale `20260926T203909Z.tar.gz.age` copiée et vérifiée sur l’autre VPS. La sauvegarde précédente a fait l’objet d’une restauration logique isolée réussie ; un exercice intégral de reprise des rôles, privilèges et fichiers reste distinct de cette vérification.

Le Mac conservait encore une ancienne résolution via son cache système au moment de la bascule, malgré les réponses DNS publiques correctes. La purge simple n’a pas suffi ; la purge de mDNSResponder nécessite le mot de passe administrateur saisi localement. Aucune entrée artificielle dans `/etc/hosts` n’a été ajoutée. Après la purge effectuée par l’utilisateur, le Mac résout bien `178.104.185.75`, `/api/health` répond 200 et Chrome affiche la nouvelle page « Deux écrans. Une seule histoire. ». Les boutons de paiement y sont explicitement désactivés (« Paiements bientôt ouverts »).

## Observation et suites

Suivi horaire programmé pendant 48 heures, jusqu’au 28 septembre 2026 à 20:39 UTC, automation `surveiller-la-production-duoshot-pendant-48-h`. Contrôles : HTTPS, erreurs Auth/SMTP/webhooks, worker/rendus, disque et sauvegardes. Notifications seulement pour incident, action requise ou bilan final. Les sauvegardes interrompent brièvement les services ; le suivi doit en tenir compte.

Stripe live reste à configurer et à éprouver avec un paiement expressément autorisé. Le parcours Google complet avec le compte du propriétaire, les invitations d’équipe applicatives et la fiscalité restent à valider. Ne pas présenter les paiements comme opérationnels.

Les fichiers `runtime-env/*.env` sont les paramètres effectifs de Coolify. Ne pas régénérer ces fichiers depuis les anciennes valeurs de `.env` sans réconcilier les URL, SMTP, Google et l’ouverture des inscriptions.


## Suivi — 27 septembre 2026, 06:08–06:11 UTC

Contrôle effectivement exécuté à cette heure (le déclenchement initial était horodaté le 26 septembre à 21:44 UTC) ; ces constats ne représentent pas une mesure continue pendant l’intervalle.

- Les deux fronts répondent HTTP 200 ; API Auth HTTP 200 avec la clé publique (401 attendu sans clé). TLS validé sur les trois domaines, certificats encore valides 89 jours.
- Huit conteneurs sains, aucun OOM ni redémarrage signalé. Image web toujours `919b630b042d08d6599db53e99bc1fd3b39429e9`. Worker actif, trois timers actifs, aucune unité systemd en échec.
- File de rendu : aucun job en attente ou en cours, aucun bail expiré ni attente supérieure à trente minutes ; aucun rendu échoué dans l’heure précédente.
- Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux disponibles depuis la bascule. Deux messages Storage « Connection terminated » concordent exactement avec les arrêts de sauvegarde à 20:39:10 et 03:01:15 ; aucun symptôme persistant ni erreur dans les 65 dernières minutes.
- Inscriptions et Google toujours ouverts, confirmation email requise, Checkout volontairement fermé. Maintenance Storage réussie à 06:00 UTC et effacement analytics exécuté avec succès à 04:03 UTC.
- Disque VPS : 23,2 % utilisés, 27,1 Gio libres. Destination de sauvegarde : 13,9 Gio libres, cinq archives conservées.
- Sauvegarde automatique `20260927T030114Z.tar.gz.age` présente localement et hors serveur : 118 679 octets et SHA-256 identique `775bace7e52faa57309b354dfc81c3158e350d4ee82a226b00bf36a306c54b28`. Marqueur de succès au 27 septembre. Aucun arrêt ou test de restauration supplémentaire déclenché.

Situation stable : aucune intervention de production et aucune alerte requise. Suivi maintenu jusqu’à l’échéance prévue.


## Suivi — 27 septembre 2026, 09:20 UTC

Contrôle réalisé à 09:20 UTC pour le déclenchement horodaté 07:27 UTC. Les deux fronts répondent 200 depuis le Mac et le VPS ; API Auth 200 avec la clé publique. TLS valide sur les trois domaines (89 jours restants). Les huit conteneurs sont sains, sans OOM ni redémarrage signalé ; image web de référence inchangée. Worker, timers et dernières maintenances sains, aucune unité systemd en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis le précédent contrôle.

Journaux depuis 06:08 UTC : trois rejets « Server Reference ID did not match the expected format » groupés à 06:22:52, sans récurrence ultérieure observée ni impact actuel. Aucun échec SMTP/webhook ou Auth relevé. Le signal initialement classé 5xx par une recherche textuelle dans Envoy est un faux positif : réponse HTTP 200, avec la valeur 529 dans un autre champ du journal. Aucun incident durable établi, aucune modification de production.

Disque : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde `20260927T030114Z.tar.gz.age` toujours présente des deux côtés, 118 679 octets et SHA-256 identique à celui consigné précédemment ; copie distante avec 13,9 Gio libres et cinq archives. Inscriptions/Google et confirmation email inchangés ; Checkout volontairement fermé. Suivi poursuivi, sans alerte.


## Suivi — 27 septembre 2026, 18:01 UTC

Les fronts répondent HTTP 200 depuis le Mac et le VPS ; API Auth 200 avec la clé publique. TLS valide sur les trois domaines, 89 jours restants. Huit conteneurs sains, aucun OOM ni redémarrage signalé, image applicative de référence inchangée. Worker et timers actifs ; maintenances réussies et aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis le précédent contrôle.

Depuis 09:19 UTC, trois rejets de Server Reference ID au format invalide sont groupés à 09:49:12–13, identiques aux rejets déjà observés. Aucun autre indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx relevé dans les journaux contrôlés, sans impact actuel constaté. Aucun changement de configuration ou test utilisateur effectué.

Disque stable : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde quotidienne `20260927T030114Z.tar.gz.age` toujours vérifiée localement et hors serveur (118 679 octets, SHA-256 identique `775bace7e52faa57309b354dfc81c3158e350d4ee82a226b00bf36a306c54b28`) ; destination avec cinq archives et 13,9 Gio libres. Auth et fermeture volontaire de Checkout inchangées. Aucune alerte requise ; observation maintenue jusqu’au 28 septembre à 20:39 UTC.


## Suivi — 27 septembre 2026, 18:59 UTC

Disponibilité confirmée : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec la clé publique, TLS valide sur les trois domaines (89 jours restants). Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs ; maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 18:01 UTC. Aucun nouvel indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés sur cet intervalle.

Disque : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde `20260927T030114Z.tar.gz.age` confirmée sur les deux serveurs : 118 679 octets, SHA-256 identique à celui consigné précédemment. Cinq archives distantes, 13,9 Gio libres, succès quotidien daté du 27 septembre. Inscriptions et Google ouverts avec confirmation email ; Checkout reste volontairement fermé. Situation stable, aucune intervention ni alerte ; suivi maintenu.


## Suivi — 28 septembre 2026, 05:53–05:55 UTC — accès SSH bloqué

Contrôle exécuté à cette heure pour le déclenchement horodaté le 27 septembre à 19:57 UTC. Les fronts restent accessibles depuis le Mac (HTTP 200, validation TLS réussie) ; les certificats des trois domaines sont valides, avec expiration le 25 décembre. L’API Auth est accessible mais exige sa clé publique ; ce contrôle externe ne remplace pas sa sonde authentifiée.

Nouveau blocage de surveillance : authentification SSH refusée sur les deux VPS avec la clé habituelle. Une tentative diagnostique confirme que le serveur DuoShot reconnaît la clé publique, mais l’authentification n’aboutit pas. Le chargement non interactif de la clé privée depuis le trousseau macOS a également échoué. Aucun paramètre SSH, DNS, compte ou service n’a été modifié.

L’état actuel des conteneurs, du worker, des rendus, des journaux, du disque et de la sauvegarde du 28 septembre n’a donc pas pu être vérifié. Dernier contrôle interne complet : 27 septembre à 18:59 UTC. Blocage SSH signalé une seule fois à l’utilisateur, avec demande de charger la clé dans son Terminal ; ne pas répéter cette notification tant que la cause et les symptômes restent inchangés. Surveillance externe maintenue jusqu’à l’échéance prévue.


## Suivi — 28 septembre 2026, 06:14 UTC

Contrôles externes stables : les deux fronts répondent HTTP 200, API Auth HTTP 401 attendu sans clé, validation TLS réussie sur les trois domaines (88 jours restants). Checkout reste volontairement fermé. Une tentative SSH non interactive sur chacun des deux VPS confirme le même refus d’authentification par clé ; aucune nouvelle tentative de déverrouillage ni modification n’a été effectuée. Les contrôles internes et la sauvegarde du 28 septembre restent non vérifiables. Blocage déjà signalé à 05:55 UTC : aucune notification répétée. Suivi externe maintenu jusqu’à l’échéance prévue.


## Suivi — 28 septembre 2026, 07:15–07:16 UTC — accès SSH rétabli

L’authentification habituelle fonctionne de nouveau sur les deux VPS sans changement de configuration effectué par ce suivi. Le blocage précédemment signalé est résolu ; les contrôles internes ont repris.

Fronts HTTP 200 depuis le Mac, API Auth HTTP 200 avec la clé publique ; TLS valide sur les trois domaines (88 jours restants). Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, dernières maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis le dernier contrôle interne complet du 27 septembre à 18:59 UTC. Les journaux de cet intervalle ne montrent aucun indicateur d’erreur Auth/SMTP/webhook ou HTTP 5xx ; un message Storage « Connection terminated » à 03:01:27 correspond à la sauvegarde de 03:01:26.

Sauvegarde du 28 septembre désormais vérifiée : `20260928T030126Z.tar.gz.age`, 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique sur les deux serveurs. Marqueur de succès au 28 septembre ; six archives distantes et 13,9 Gio libres. Disque VPS stable à 23,2 % utilisés et 27,0 Gio libres. Inscriptions/Google ouverts, confirmation email requise, Checkout volontairement fermé. Aucun test utilisateur ni aucune modification de production ; suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 08:24 UTC

Contrôles externes et internes stables : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec la clé publique ; TLS valide sur les trois domaines (88 jours restants). Huit conteneurs sains, image `919b630b042d08d6599db53e99bc1fd3b39429e9` inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, avec bail expiré, en attente depuis plus de 30 minutes ou échoué depuis 07:15 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 07:15 UTC.

Disque VPS : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` confirmée sur les deux serveurs : 120 786 octets, SHA-256 identique à celui consigné à 07:16 UTC ; succès quotidien daté du 28 septembre. Six archives hors serveur, 13,9 Gio libres sur leur volume. Inscriptions et Google ouverts, confirmation email requise, Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire ; suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 09:17 UTC

Disponibilité stable : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec la clé publique (401 attendu sans clé depuis le Mac). Certificats vérifiés sur les trois domaines, expiration le 25 décembre 2026. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs ; maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 08:24 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 08:24 UTC.

Disque VPS stable : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` vérifiée sur les deux serveurs : 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique ; marqueur quotidien au 28 septembre. Six archives hors serveur, 13,9 Gio libres. Inscriptions et Google ouverts, confirmation email requise ; Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire. Suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 10:17 UTC

Contrôles stables : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec la clé publique (401 attendu sans clé depuis le Mac). TLS vérifié sur les trois domaines, certificats valides jusqu’au 25 décembre 2026. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 09:17 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 09:17 UTC.

Disque VPS : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` présente sur les deux serveurs : 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique ; succès quotidien daté du 28 septembre. Six archives hors serveur, 13,9 Gio libres sur le volume de destination. Inscriptions et Google ouverts, confirmation email requise ; Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire. Suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 12:30 UTC

Contrôle effectué à 12:30 UTC pour le déclenchement horodaté 11:31 UTC. Fronts HTTP 200 depuis le Mac et le VPS ; API Auth HTTP 200 avec la clé publique, 401 attendu sans clé. TLS vérifié sur les trois domaines, certificats valides jusqu’au 25 décembre 2026. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 10:17 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 10:17 UTC.

Disque VPS stable : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` confirmée sur les deux serveurs : 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique ; succès quotidien daté du 28 septembre. Six archives hors serveur, 13,9 Gio libres sur le volume de destination. Inscriptions et Google ouverts, confirmation email requise ; Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire. Suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 12:32 UTC

Nouveau déclenchement rapproché du contrôle de 12:30 UTC. État reconfirmé : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec clé publique (401 attendu sans clé), TLS valide sur les trois domaines jusqu’au 25 décembre. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage ; worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué et aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 12:30 UTC.

Disque VPS à 23,2 % utilisés, 27,0 Gio libres. Archive chiffrée `20260928T030126Z.tar.gz.age` toujours identique sur les deux serveurs (120 786 octets, SHA-256 consigné au contrôle précédent), succès quotidien au 28 septembre ; six archives distantes et 13,9 Gio libres. Inscriptions et Google ouverts, confirmation email requise, Checkout volontairement fermé. Aucune intervention nécessaire ; suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 13:32 UTC

Disponibilité stable : fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec la clé publique (401 attendu sans clé). TLS vérifié sur les trois domaines, certificats valides jusqu’au 25 décembre. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 12:32 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 12:32 UTC.

Disque VPS : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` confirmée sur les deux serveurs : 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique ; succès quotidien daté du 28 septembre. Six archives hors serveur, 13,9 Gio libres sur le volume de destination. Inscriptions et Google ouverts, confirmation email requise ; Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire. Suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 18:33 UTC

Contrôle exécuté à 18:33 UTC pour le déclenchement horodaté 14:39 UTC ; absence de sondage intermédiaire depuis 13:32 UTC. Fronts HTTP 200 depuis le Mac et le VPS ; API Auth HTTP 200 avec la clé publique (401 attendu sans clé). TLS vérifié sur les trois domaines, certificats valides jusqu’au 25 décembre. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis 13:32 UTC. Aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 13:32 UTC ; ces contrôles rétrospectifs ne prouvent pas une disponibilité continue entre les sondages.

Disque VPS stable : 23,2 % utilisés, 27,0 Gio libres. Sauvegarde chiffrée `20260928T030126Z.tar.gz.age` confirmée sur les deux serveurs : 120 786 octets, SHA-256 `bcdd61535b4688cc7985c6e6a3e6a17c4193818f63c1809015e29caa0dc3488b` identique ; succès quotidien daté du 28 septembre. Six archives hors serveur, 13,9 Gio libres. Inscriptions et Google ouverts, confirmation email requise ; Checkout volontairement fermé. Aucune modification de production ni action utilisateur nécessaire. Suivi maintenu jusqu’à 20:39 UTC.


## Suivi — 28 septembre 2026, 18:34 UTC

Déclenchement rapproché du contrôle de 18:33 UTC : disponibilité et état interne reconfirmés. Fronts HTTP 200 depuis le Mac et le VPS, API Auth HTTP 200 avec clé publique (401 attendu sans clé), TLS valide sur les trois domaines jusqu’au 25 décembre. Huit conteneurs sains, image de référence inchangée, aucun OOM ni redémarrage ; worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué, et aucun indicateur d’erreur applicative, Auth/SMTP/webhook ou HTTP 5xx dans les journaux contrôlés depuis 18:33 UTC.

Disque VPS inchangé à 23,2 % utilisés et 27,0 Gio libres. Archive chiffrée `20260928T030126Z.tar.gz.age` vérifiée sur les deux serveurs : 120 786 octets, même SHA-256 que celui consigné à 18:33 UTC ; succès quotidien au 28 septembre. Six archives hors serveur, 13,9 Gio libres. Inscriptions et Google ouverts, confirmation email requise, Checkout volontairement fermé. Aucune intervention nécessaire ; suivi maintenu jusqu’à 20:39 UTC.


## Clôture du suivi — 29 septembre 2026, 06:17 UTC

Échéance prévue : 28 septembre à 20:39 UTC. Le déclenchement horodaté 19:45 UTC a été exécuté le lendemain matin ; ce contrôle final est donc tardif. Dernier sondage précédent : 28 septembre à 18:34 UTC. Les journaux conservés depuis ce sondage ont été contrôlés rétrospectivement, sans pouvoir attester une disponibilité continue entre les sondages.

État final : fronts HTTP 200 depuis le Mac et le VPS ; API Auth HTTP 200 avec la clé publique, 401 attendu sans clé. Certificats TLS vérifiés sur les trois domaines, valides jusqu’au 25 décembre 2026 (87 jours restants). Huit conteneurs sains, image `919b630b042d08d6599db53e99bc1fd3b39429e9` inchangée, aucun OOM ni redémarrage signalé. Worker et timers actifs, maintenances réussies, aucune unité en échec. Aucun rendu en attente, actif, bloqué ou échoué depuis le dernier sondage.

Journaux : aucun indicateur d’erreur Auth/SMTP/webhook ou HTTP 5xx dans les sources contrôlées. Quatre erreurs web « Server Reference ID did not match » le 28 septembre (trois à 19:08:58–59 et une à 19:52:39), sans impact durable observé ; cause et impact ponctuel non établis par ces sondages. Une erreur Storage « Connection terminated » le 29 septembre à 03:00:17 correspond à la sauvegarde démarrée à 03:00:16, suivie du retour de tous les services à un état sain.

Sauvegarde quotidienne du 29 septembre vérifiée sur le VPS et le serveur distinct : `20260929T030016Z.tar.gz.age`, 120 790 octets, SHA-256 `8a4554af3ddc982cdd64f6e9813bd5fab3df266b96d3f06e2dd5262d00b7c3b9` identique. Marqueur quotidien au 29 septembre, sept archives conservées hors serveur, 13,9 Gio libres sur leur volume. VPS : 23,2 % utilisés, 27,0 Gio libres. Cette vérification d’intégrité ne constitue pas un nouvel exercice complet de restauration avec Storage, rôles et permissions.

Bilan : aucun incident durable de production observé pendant les contrôles. Le blocage SSH du 28 septembre au matin a été signalé puis résolu ; les retards de déclenchement et ce blocage limitent la couverture du suivi. Inscriptions et Google ouverts, confirmation email requise ; Stripe Checkout demeure volontairement désactivé faute d’accès live. Le suivi ne valide pas un paiement réel ni un parcours utilisateur complet supplémentaire.

L’automation `surveiller-la-production-duoshot-pendant-48-h` a été supprimée à l’issue du contrôle final, confirmation de l’application reçue. Les timers de sauvegarde et de maintenance sur le VPS restent actifs. Aucun compte créé, message client envoyé, paiement déclenché, DNS modifié ou service ancien résilié pendant cette clôture.
