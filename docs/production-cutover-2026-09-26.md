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
