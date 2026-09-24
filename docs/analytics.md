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
