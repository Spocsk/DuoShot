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
