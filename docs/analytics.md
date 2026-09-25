# Analytics DuoShot

Vercel Web Analytics reste la source des pages vues agrégées. Mixpanel est utilisé uniquement après consentement pour les parcours produit. Aucun événement Mixpanel n'est émis sans `NEXT_PUBLIC_MIXPANEL_TOKEN` au moment du build.

## Activation

1. Créer un projet **Mixpanel EU** et récupérer son project token. Configurer `NEXT_PUBLIC_MIXPANEL_TOKEN` dans Vercel avant le déploiement ; le navigateur et les événements serveur utilisent le point d'ingestion UE.
2. Appliquer les migrations Supabase `20260924120000_analytics_consent.sql` et `20260924123000_analytics_erasure_jobs.sql` avant de définir le jeton Mixpanel. Le client enregistre les choix des comptes dans `consent_events`.
3. Configurer `MIXPANEL_GDPR_OAUTH_TOKEN` et `CRON_SECRET` côté serveur. La tâche Vercel quotidienne soumet puis vérifie les demandes d'effacement Mixpanel après suppression d'un compte. Surveiller `analytics_erasure_jobs` : `status = done` signifie que Mixpanel a confirmé la fin de la tâche.
4. Vérifier en preview avec des comptes de test : refus = aucune requête Mixpanel ; acceptation = `page_viewed` et événements produit ; suppression du compte = ligne dans `analytics_erasure_jobs`, puis tâche `done`.

Le jeton Mixpanel doit être présent lors du **build** Next.js. Les événements recueillis côté navigateur restent soumis aux bloqueurs de traceurs et au consentement. Vercel et Mixpanel n'auront donc pas les mêmes totaux.

## Événements et propriétés

| Événement | Déclenchement | Propriétés transmises |
| --- | --- | --- |
| `page_viewed` | Route affichée après accord | Route normalisée, langue |
| `page_engagement` | 30 s visibles, changement de page ou onglet masqué | Route normalisée, langue, secondes visibles |
| `auth_succeeded` | Connexion aboutie après intention de connexion | Méthode |
| `account_created` | Inscription e-mail aboutie | Méthode |
| `captures_added` | Import valide | Côté, nombre ajouté |
| `export_requested` / `export_failed` | Demande / erreur | Offre, nombre ou catégorie d'erreur |
| `export_succeeded` | ZIP enregistré par l'API | Offre, nombre, format, option 6,9″ |
| `zip_download_clicked` | Clic sur le lien du ZIP | Aucune |
| `checkout_started` | Session Stripe créée | Offre demandée |
| `subscription_activated` | Première activation confirmée par Stripe | Offre |
| `review_requested` / `review_failed` / `review_created` | Revue Studio | Offre, catégorie d'erreur ou nombre de captures |

Les noms de fichiers, contenus des captures, e-mails, noms d'apps/clients, URL complètes et identifiants de paiement ne sont pas des propriétés analytiques. Les liens `/invite/[token]` et `/r/[id]` sont normalisés aussi pour Vercel ; les routes d'authentification ne sont pas comptées par Vercel.

## Rapports à créer dans Mixpanel

- **Connexions** : volume de `auth_succeeded`, utilisateurs distincts et méthode. La connexion via lien magique dans un autre navigateur peut ne pas porter l'intention initiale ; ne pas utiliser ce chiffre comme journal d'authentification exhaustif.
- **Découverte → premier export** : `page_viewed` sur `/` ou `/tool`, `captures_added`, `auth_succeeded`, `export_succeeded`.
- **Conversion payante** : `page_viewed` sur `/pricing`, `checkout_started`, `subscription_activated`.
- **Engagement** : somme et médiane des secondes `page_engagement` par route, visites répétées, dernière route ou action observée. Configurer des sessions avec 30 minutes d'inactivité ; les dernières secondes lors d'une fermeture brutale peuvent manquer.
- **Studio** : `review_requested` → `review_created`, segmenté par offre et langue si disponibles.

Dans Mixpanel Events View, les derniers événements et profils pseudonymes donnent une **activité récente**, pas une liste fiable des personnes encore en ligne.

## Configuration au 25 septembre 2026

Projet DuoShot **4067310**, résidence EU, fuseau Europe/Paris. Les jetons public et GDPR sont configurés dans `.env.local` et Vercel Production pour le prochain déploiement. Les migrations sont appliquées. La demande d’effacement de recette a été acceptée par l’API EU et reste `submitted` sous le suivi `01a0d856-f1a8-7766-b5a2-8580440d9a91`. Un suivi horaire silencieux attend la confirmation finale ; le compte et son fichier Storage ont déjà disparu. Générer ce jeton depuis Profile → Data & Privacy, le conserver côté serveur et prévoir son renouvellement annuel ([documentation Mixpanel](https://docs.mixpanel.com/docs/privacy/end-user-data-management)). Ne marquer `done` qu’après la confirmation `SUCCESS` de l’API.

`ANALYTICS_INTERNAL_USER_IDS` contient le fondateur et les trois comptes de recette conservés. Le serveur attribue `audience=internal|external`; le navigateur démarre à `anonymous` et confirme cette propriété après identification. Exclure les profils identifiés internes de tout rapport commercial, y compris leurs événements anonymes fusionnés. Les profils `unknown` restent dans une catégorie séparée, jamais comptés comme externes.

Preuves de recette : le SDK navigateur émet vers l’UE uniquement après consentement et s’arrête après refus (test Cypress avec ingestion interceptée). Un événement diagnostic `instrumentation_check`, explicitement interne, a été envoyé à l’API EU et apparaît dans Events. Ce diagnostic ne représente aucune conversion. Les événements produit du profil Chrome initial ne sont pas apparus dans Events pendant la vérification ; la collecte navigateur réelle et les rapports sauvegardés restent à confirmer après déploiement, avec un profil sans bloqueur. Aucune donnée commerciale historique n’a été reconstruite.

## Spécification des rapports à enregistrer

| Rapport | Réglage |
|---|---|
| Découverte → premier export | Funnel `page_viewed` (accueil ou atelier) → `captures_added` → `auth_succeeded` → `export_succeeded`, fenêtre 7 jours, utilisateurs uniques, exclure cohorte interne. Prévoir une vue séparée pour les personnes déjà connectées afin de ne pas compter leur absence de reconnexion comme un abandon. |
| Temps jusqu’au premier export | Dans ce funnel, temps de conversion import → export, médiane et P90 ; limiter au premier export observé, afficher N et taux de consentement disponible. |
| Tarifs → abonnement | `page_viewed` sur tarifs → `checkout_started` → `subscription_activated`, fenêtre 7 jours, segmenter les quatre offres. Le dernier événement est produit uniquement par le webhook signé. Comparer aux abonnements réellement enregistrés dans Stripe. |
| Réutilisation | Retention `export_succeeded` → `export_succeeded`, cohortes par semaine du premier export observé, J7 et J30 ; afficher seulement les cohortes matures et leurs effectifs. |
| Revues Studio | `review_requested` → `review_created`, fenêtre 24 h, utilisateurs uniques et nombre de demandes. |
| Erreurs et abandons | `export_failed`/`review_failed` par code et étape, comptes uniques, ratio sur demandes ; abandon = absence d’étape suivante dans la fenêtre, pas fermeture supposée du navigateur. |
| Téléchargements demandés | Nombre de `zip_download_clicked` rapporté aux exports ; ce compteur ne prouve pas la réception du fichier. |

Tableaux opérationnels séparés : Supabase `export_sets`, `export_reservations`, `stripe_events`, `analytics_erasure_jobs` et Stripe pour paiements/résiliations. Les journaux ne doivent pas exposer d’URL signées ni de captures. Les rapports Mixpanel ne remplacent pas ces traces transactionnelles.
