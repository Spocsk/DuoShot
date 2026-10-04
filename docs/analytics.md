# Analytics DuoShot

DataFast est l'unique outil d'analytics produit. Il ne se charge qu'après consentement ; configuration, relais `/api/datafast/events` et validation : [`datafast.md`](datafast.md).

Mixpanel ne collecte plus rien depuis le 4 octobre 2026 : plus de SDK navigateur, plus d'événements serveur (`export_succeeded`, `review_created`, `subscription_activated` étaient aussi envoyés à Mixpanel par l'API et le webhook Stripe), plus d'autorisation CSP, plus de `NEXT_PUBLIC_MIXPANEL_TOKEN` au build. Seul l'effacement des données déjà envoyées au projet Mixpanel UE est conservé (voir plus bas).

## Événements et propriétés

| Événement | Déclenchement | Propriétés transmises |
| --- | --- | --- |
| `page_viewed` | Route affichée après accord | Route normalisée (page vue native DataFast) |
| `page_engagement` | 30 s visibles, changement de page ou onglet masqué | Route normalisée, langue, secondes visibles |
| `auth_succeeded` | Connexion aboutie après intention de connexion | Méthode |
| `account_created` | Inscription e-mail aboutie | Méthode |
| `captures_added` | Import valide | Côté, nombre ajouté |
| `export_requested` / `export_failed` | Demande / erreur | Offre, nombre ou catégorie d'erreur |
| `export_succeeded` | Réponse de rendu réussie reçue par le navigateur | Offre, nombre, format, option 6,9″ |
| `zip_download_clicked` | Clic sur le lien du ZIP | Aucune |
| `checkout_started` | Session Stripe créée | Offre demandée |
| `subscription_activated` | Retour Checkout avec droits Indie ou Studio confirmés | Offre |
| `review_requested` / `review_failed` / `review_created` | Revue Studio | Offre, catégorie d'erreur ou nombre de captures |

Chaque événement porte `audience=anonymous|internal|external|unknown`. `ANALYTICS_INTERNAL_USER_IDS` liste les comptes internes ; le serveur renvoie l'audience via `/api/billing/status` après connexion et consentement. Exclure `internal` de tout rapport commercial et garder `unknown` à part.

Les noms de fichiers, contenus des captures, e-mails, noms d'apps/clients, URL complètes et identifiants de paiement ne sont pas des propriétés analytiques. Les liens `/invite/[token]` et `/r/[id]` sont normalisés.

Les conversions (`export_succeeded`, `review_created`, `subscription_activated`) dépendent du retour du navigateur : il n'existe plus de collecte serveur indépendante. Comparer `subscription_activated` aux abonnements réellement enregistrés dans Stripe.

## Rapports à suivre dans DataFast

- **Découverte → premier export** : `page_viewed` sur `/` ou `/tool`, `captures_added`, `auth_succeeded`, `export_succeeded`.
- **Conversion payante** : `page_viewed` sur `/pricing`, `checkout_started`, `subscription_activated`.
- **Engagement** : secondes `page_engagement` par route ; les dernières secondes lors d'une fermeture brutale peuvent manquer.
- **Studio** : `review_requested` → `review_created`.
- **Erreurs** : `export_failed` / `review_failed` par code, rapportés aux demandes.

Tableaux opérationnels séparés : Supabase `export_sets`, `export_reservations`, `stripe_events`, `analytics_erasure_jobs` et Stripe pour paiements/résiliations. Les analytics ne remplacent pas ces traces transactionnelles.

## Effacement des données Mixpanel historiques

Le projet Mixpanel UE **4067310** contient encore les événements pseudonymes reçus avant l'arrêt de la collecte. Tant qu'il existe, la suppression d'un compte ajoute toujours une ligne dans `analytics_erasure_jobs` (indépendamment de toute variable Mixpanel), et la tâche `GET /api/cron/analytics-erasure` (timer systemd `duoshot-analytics.timer`, 04:00 UTC) soumet puis suit la demande GDPR auprès de l'API UE.

Variables serveur, lues à l'exécution et jamais intégrées au build :

- `MIXPANEL_PROJECT_TOKEN` : jeton du projet, exigé en paramètre par l'API GDPR de Mixpanel. Reprendre la valeur de l'ancien `NEXT_PUBLIC_MIXPANEL_TOKEN`.
- `MIXPANEL_GDPR_OAUTH_TOKEN` : jeton OAuth GDPR (Profile → Data & Privacy, renouvellement annuel, [documentation Mixpanel](https://docs.mixpanel.com/docs/privacy/end-user-data-management)).
- `CRON_SECRET` : protège la tâche.

Sans les deux variables Mixpanel, la tâche répond `configured: false` et les demandes restent en file jusqu'à leur configuration. `status = done` signifie que Mixpanel a confirmé `SUCCESS`.

Fin de vie : une fois la file vidée, supprimer le projet Mixpanel efface toutes les données restantes. Le code d'effacement, la table et les deux variables pourront alors être retirés.
