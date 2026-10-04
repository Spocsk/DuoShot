# Vérification Mixpanel — 27 septembre 2026

> **Note (4 octobre 2026)** : Mixpanel a été retiré ; DataFast est l’unique outil d’analytics. Ce document décrit l’état à sa date. État actuel : [`analytics.md`](../analytics.md).

Contrôles réalisés vers 08:38–08:40 Europe/Paris sur https://duoshot.site, image de production `919b630b042d08d6599db53e99bc1fd3b39429e9`.

## Résultat

La collecte navigateur est opérationnelle de bout en bout dans le projet DuoShot EU `4067310`, vue `4563765`.

- Profil de navigateur isolé, sans session utilisateur : aucune requête Mixpanel avant consentement.
- Après clic sur **Accepter**, le vrai SDK 2.83.0 envoie `page_viewed` pour `/`, puis `page_engagement` et `page_viewed` pour `/tool` vers `https://api-eu.mixpanel.com/track/`.
- Réponses réelles HTTP 200, corps `{"error":null,"status":1}` ; aucune interception simulée.
- Réception confirmée visuellement dans **Events** du projet, en recoupant l'identifiant anonyme du navigateur de test : `$device:1a2043ad-fcc2-4aa7-bab8-7df4619e9537`. Ces événements sont des visites de recette, pas des utilisateurs commerciaux ; audience `anonymous`.
- Après clic sur **Refuser**, le compteur de requêtes reste inchangé lors du passage à `/specs`. Le choix `rejected` persiste après rechargement.
- Données observées : page normalisée, langue, secondes visibles, audience et métadonnées techniques du SDK ; pas d'e-mail ni de contenu de captures. Paramètre `ip=0`.

## Configuration et serveur

- Jeton public présent dans le build navigateur ; même jeton côté serveur et dans l'environnement local (comparaison d'empreintes).
- Variables de production présentes : `NEXT_PUBLIC_MIXPANEL_TOKEN`, `MIXPANEL_GDPR_OAUTH_TOKEN`, `ANALYTICS_INTERNAL_USER_IDS`, `CRON_SECRET`. Aucune valeur secrète reproduite ici.
- Aucun `analytics_delivery_failed` dans les journaux disponibles du conteneur web sur les dernières 24 heures.
- `consent_events` accessible, un consentement analytics positif présent ; table `analytics_erasure_jobs` accessible et vide.
- Maintenance analytics quotidienne active ; dernière exécution le 27 septembre à 04:03:15 UTC, code 0.
- Des événements serveur `export_succeeded` et `review_created` des recettes antérieures sont visibles dans Mixpanel. Aucun nouvel export, paiement ou effacement de compte déclenché pour cet audit.

## Tests et limites

Les quatre suites ciblées passent : 8 tests (client, serveur, normalisation des chemins, effacement analytics). Ces tests automatisés utilisent des mocks ; la preuve réelle de collecte navigateur est distincte et décrite ci-dessus.

Le paiement complet et son événement `subscription_activated` ne sont pas validés par cet audit. Une file d'effacement vide et un cron réussi ne prouvent pas la validité du jeton GDPR ni l'achèvement d'une suppression externe.

`docs/analytics.md` contient encore des indications historiques Vercel et une réserve ancienne sur la collecte navigateur. Le déploiement actuel utilise le VPS, GitHub Actions pour le build et systemd pour la maintenance ; la présente vérification lève la réserve sur la collecte navigateur.

[Événements Mixpanel](https://eu.mixpanel.com/project/4067310/view/4563765/app/events)
