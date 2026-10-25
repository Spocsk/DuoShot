# Analytics DuoShot

Umami est l'unique outil d'analytics produit. Il ne se charge qu'après consentement ; configuration, relais `/api/umami/api/send` et validation : [`umami.md`](umami.md).

Mixpanel ne collecte plus rien depuis le 4 octobre 2026 : plus de SDK navigateur, plus d'événements serveur (`export_succeeded`, `review_created`, `subscription_activated` étaient aussi envoyés à Mixpanel par l'API et le webhook Stripe), plus d'autorisation CSP, plus de `NEXT_PUBLIC_MIXPANEL_TOKEN` au build. Seul l'effacement des données déjà envoyées au projet Mixpanel UE est conservé (voir plus bas).

Les données de mesure d’audience Umami ne sont rattachées à aucun compte ni à aucune personne identifiée ; elles sont conservées 25 mois, puis supprimées automatiquement.

## Événements et propriétés

| Événement | Déclenchement | Propriétés transmises |
| --- | --- | --- |
| `page_viewed` | Route affichée après accord | Route normalisée (page vue native Umami) |
| `page_engagement` | 30 s visibles, changement de page ou onglet masqué | Route normalisée, langue, secondes visibles |
| `auth_succeeded` | Connexion aboutie après intention de connexion | Méthode |
| `account_created` | Inscription e-mail aboutie | Méthode |
| `captures_added` | Import valide | Côté, nombre ajouté |
| `export_requested` / `export_failed` | Demande / erreur | Offre, nombre ou catégorie d'erreur |
| `export_succeeded` | Réponse de rendu réussie reçue par le navigateur | Offre, nombre |
| `zip_download_clicked` | Clic sur le lien du ZIP | Aucune |
| `checkout_started` | Session Stripe créée | Offre demandée |
| `subscription_activated` | Retour Checkout avec droits Indie ou Studio confirmés | Offre |
| `review_requested` / `review_failed` / `review_created` | Revue Studio | Offre, catégorie d'erreur ou nombre de captures |

Chaque événement personnalisé porte `audience=anonymous|internal|external|unknown`. `ANALYTICS_INTERNAL_USER_IDS` liste les comptes internes ; le serveur renvoie l'audience via `/api/billing/status` après connexion et consentement. La donnée de session `audience` est aussi mise à jour par `identify({ audience })`, sans ID distinct. Exclure `internal` de tout rapport commercial et garder `unknown` à part.

Les noms de fichiers, contenus des captures, e-mails, noms d'apps/clients, URL complètes et identifiants de paiement ne sont pas des propriétés analytiques. Les liens `/invite/[token]` et `/r/[id]` sont normalisés.

Les conversions (`export_succeeded`, `review_created`, `subscription_activated`) dépendent du retour du navigateur. Le revenu est mesuré séparément par `payment_succeeded` depuis le webhook Stripe, après traitement et insertion du marqueur d’idempotence, uniquement pour les paiements réels. Propriétés : `revenue`, `currency`, `plan`, `audience`, et pour les factures `interval`, `billing_reason`. Cette mesure serveur est indépendante du consentement navigateur et sans attribution par visiteur. Stripe reste la référence comptable.

## Rapports à suivre dans Umami

- **Goals** : pages `/pricing`, `/tool` ; événements `captures_added`, `export_succeeded`, `checkout_started`, `subscription_activated`, `payment_succeeded`, `review_created`.
- **Découverte → premier export** (60 min) : page `/tool` → `captures_added` → `export_requested` → `export_succeeded`. Variante avec `auth_succeeded` avant l’export.
- **Conversion payante** (1 jour) : page `/pricing` → `checkout_started` → `subscription_activated`.
- **Accueil → paiement** (1 jour) : page `/` → page `/tool` → `export_succeeded` → `checkout_started`.
- **Studio** (60 min) : `review_requested` → `review_created`.
- **Journeys** : départ `/` ou `/en`, cinq étapes, événements compris.
- **Revenue** : EUR, événement `payment_succeeded` ; sans attribution par visiteur.
- **UTM / Attribution** : campagnes nettoyées de la première page vue ; conversions `export_succeeded` ou `payment_succeeded` (ce dernier dans une session serveur séparée).
- **Engagement et erreurs** : secondes `page_engagement` par route ; `export_failed` / `review_failed` par `reason`, rapportés aux demandes. Les dernières secondes d’une fermeture brutale peuvent manquer.
- **Notes de déploiement** : journal externe de l’exploitant ; Umami n’a pas d’annotations.

Tableaux opérationnels séparés : Supabase `export_sets`, `export_reservations`, `stripe_events`, `analytics_erasure_jobs` et Stripe pour paiements/résiliations. Les analytics ne remplacent pas ces traces transactionnelles.

## Effacement des données Mixpanel historiques

Le projet Mixpanel UE **4067310** contient encore les événements pseudonymes reçus avant l'arrêt de la collecte. Tant qu'il existe, la suppression d'un compte ajoute toujours une ligne dans `analytics_erasure_jobs` (indépendamment de toute variable Mixpanel), et la tâche `GET /api/cron/analytics-erasure` (timer systemd `duoshot-analytics.timer`, 04:00 UTC) soumet puis suit la demande GDPR auprès de l'API UE.

Variables serveur, lues à l'exécution et jamais intégrées au build :

- `MIXPANEL_PROJECT_TOKEN` : jeton du projet, exigé en paramètre par l'API GDPR de Mixpanel. Reprendre la valeur de l'ancien `NEXT_PUBLIC_MIXPANEL_TOKEN`.
- `MIXPANEL_GDPR_OAUTH_TOKEN` : jeton OAuth GDPR (Profile → Data & Privacy, renouvellement annuel, [documentation Mixpanel](https://docs.mixpanel.com/docs/privacy/end-user-data-management)).
- `CRON_SECRET` : protège la tâche.

Sans les deux variables Mixpanel, la tâche répond `configured: false` et les demandes restent en file jusqu'à leur configuration. `status = done` signifie que Mixpanel a confirmé `SUCCESS`.

Fin de vie : une fois la file vidée, supprimer le projet Mixpanel efface toutes les données restantes. Le code d'effacement, la table et les deux variables pourront alors être retirés.
