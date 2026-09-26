# Migration, Auth et facturation — suivi du 26 septembre 2026

## État et limites

Le front reste privé sur le VPS. Le site `duoshot.site` reste chez Vercel. L’API `https://api.duoshot.site` pointe désormais sur le VPS, via Coolify/Traefik et HTTPS. PostgreSQL et le port API direct restent privés. Les inscriptions restent désactivées et aucun compte source n’a été migré.

Inventaire source en lecture seule : projet `jvhqcmqwrihbtwrggwuq`, 4 utilisateurs, 4 workspaces, 6 adhésions, 16 export_sets, 5 réservations d’export, 2 reviews, 2 consent_events, aucun stripe_event ni checkout_attempt. Ce relevé n’est pas une sauvegarde cohérente. La connexion PostgreSQL complète est encore absente du fichier privé `~/.config/duoshot/source-database-url`.

Les buckets source uploads/exports sont privés ; **reviews est public à la source**. La migration doit conserver les fichiers et références tout en maintenant le bucket reviews privé sur la cible ; ne pas recopier aveuglément son attribut public. Vérifier les anciennes reviews avec le proxy de médias et leur révocation.

## Auth et email

- Configuration Google existante récupérée dans des fichiers privés mode 600, hors dépôt. Client confirmé identique dans Google Cloud et Supabase.
- Nouvelle origine `https://duoshot.site` et callback `https://api.duoshot.site/auth/v1/callback` ajoutés au client Google ; ancien callback Supabase conservé. Fiche de présentation complétée avec accueil, confidentialité et conditions. Application Google publiée : statut « In production » vérifié dans la console.
- Sur le VPS : Google activé, SMTP Resend sur 2587/STARTTLS, confirmation email requise, inscription toujours fermée. URL API externe et issuer JWT adaptés au domaine API final.
- Domaine Resend `duoshot.site` vérifié en région UE. Clé limitée à l’envoi pour ce domaine ; suivi des clics et ouvertures désactivé, TLS de livraison requis. Offre existante : 100 emails/jour et 3 000/mois partagés entre projets, 3 domaines utilisés sur 3. Aucun nouvel abonnement.
- Test SMTP depuis le VPS livré à la boîte du propriétaire : reçu Resend `01a0df51-4183-74dc-8b63-925b26c69c96`. Ce test valide transport/authentification/livraison ; il ne remplace pas la recette des comptes migrés et callbacks sur le front final.
- Callbacks applicatifs corrigés : origine publique configurée, destination interne uniquement, erreurs et codes manquants/expirés explicites, tokens exclus des redirections d’erreur. Cookies Secure en HTTPS et SameSite=Lax sur navigateur, serveur et proxy.
- Pages FR/EN de demande et saisie d’un nouveau mot de passe, avec réponse de demande non révélatrice de l’existence du compte. Pages non indexables.

## Stripe

Le connecteur n’expose encore que Tech Master **test** ; un lien d’autorisation production a été demandé. Aucun débit, produit live ou webhook live créé sans identifier le compte marchand.

`APP_ENV=production` est configuré sur le VPS. La facturation exige une correspondance explicite entre l’environnement et la clé : `production` accepte seulement `sk_live_`/`rk_live_`, `test` et `development` seulement les clés test. Une valeur absente ou inconnue ferme la facturation. Les webhooks existants restent traités lorsque Checkout est fermé, si leur mode est cohérent.

`BILLING_ALLOWED_USER_IDS` peut limiter la recette Checkout à une liste d’UUID contrôlés. Le contrôle est appliqué côté serveur et l’état public est masqué pendant la recette. Les routes Checkout, portail et webhook restent les mêmes. `STRIPE_CHECKOUT_ENABLED=false` et `STRIPE_LIVE_ENABLED=false` restent actifs.

Avant ouverture : confirmer compte, capacités d’encaissement/versement et fiscalité ; valider quatre prix live et portail ; configurer le webhook signé ; tester les cycles d’abonnement dans une base isolée. Présenter ensuite l’achat réel concret pour accord avant débit. Les inscriptions fiscales ne sont pas déduites ni inventées.

## DNS d’envoi configurés chez Vercel

| Nom | Type | Valeur |
| --- | --- | --- |
| `resend._domainkey` | TXT | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1dKGTNBGflG2XKKthz0nMCgQxhAm88W5O5BIEuBg2yIvYYaG3DHHLnyK494EbU5862nCKcI7eCrWdFpZn0d3eYWVfMMlsJ0Etr1V+7DnzpbwTmvycTIQF1dGntkwig12Ylf13hU8wOS1R4MA+x0ikvk7XwypONyBgqYgyDqw64QIDAQAB` |
| `send` | MX, priorité 10 | `feedback-smtp.eu-west-1.amazonses.com` |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |
| `rsend` | CNAME | `send.forge.rmta.net` |
| `_dmarc` | TXT | `v=DMARC1; p=none;` |

Le DMARC initial surveille sans rejeter ; aucune boîte de rapports n’est inventée. Les enregistrements du site et la vérification Google existants sont préservés. L’enregistrement `api` A désigne `178.104.185.75`.

## Suite de la bascule

1. Obtenir PostgreSQL source, vérifier versions/extensions et préparer les exports chiffrés ; répéter la restauration avec Auth, droits, migrations, Storage et contrôles applicatifs.
2. Tester les parcours Auth réels sur le domaine final ; valider Stripe live séparément.
3. Après réussite de la répétition : courte maintenance avec blocage réel des écritures source, y compris clients déjà ouverts, uploads, inscriptions et tâches planifiées. Traiter explicitement les événements Stripe en attente si des abonnements existent.
4. Synchroniser les données finales, vérifier les comptes/objets/reviews, sauvegarder, puis basculer le domaine principal. Reconnexion nécessaire avec les nouvelles clés Auth.
5. Avant réouverture, retour source possible ; après nouvelles écritures sur le VPS, réconciliation préalable obligatoire. Aucun simple retour DNS vers des données anciennes.
6. Commencer les 48 heures d’observation après la bascule effective, pas à la création de cette API. Ne résilier aucun service avant validation.
