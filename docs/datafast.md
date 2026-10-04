# Datafast DuoShot

DataFast est l'unique outil d'analytics produit depuis le 4 octobre 2026 (Mixpanel retiré, voir [`analytics.md`](analytics.md)). Le SDK officiel `datafast` 3.0.18 est initialisé après le consentement statistique. Il remplace le script global ajouté dans `607f69f`, afin de contrôler les événements, les URLs et l'arrêt après retrait du consentement.

- Site : `duoshot.site`, identifiant public `dfid_DliBSHc6MXbO4ktr5mKn8`.
- SDK chargé dynamiquement ; aucun appel avant acceptation. Les refus précédents sont conservés. Une ancienne acceptation antérieure à DataFast (clé v1) demande un nouveau choix.
- Les requêtes passent par `/api/datafast/events`. Le serveur exige le cookie de consentement v2, conserve les propriétés prévues et normalise les URLs : aucun token d'invitation, identifiant de revue, query string, e-mail ou contenu de capture.
- Les URLs de référence externes sont réduites à leur origine. Les paramètres UTM et identifiants publicitaires ne sont pas collectés.
- SDK désactivé sur localhost et pour les navigateurs automatisés selon son comportement officiel. Ne pas interpréter un test local comme une preuve de réception en production.
- Le refus appelle `optOut()`, vide la file du SDK et bloque également le relais côté serveur.

## Événements

`page_viewed` alimente les pages vues natives de Datafast. Les autres événements client existants sont transmis sous leur nom : `page_engagement`, `auth_succeeded`, `account_created`, `captures_added`, `export_requested`, `export_failed`, `zip_download_clicked`, `checkout_started`, `review_requested`, `review_failed`.

Les confirmations `export_succeeded` et `review_created` sont émises par le navigateur après une réponse de rendu réussie, y compris à la récupération d'un rendu. `subscription_activated` est émis au retour Checkout lorsque les droits Stripe Indie ou Studio sont confirmés. Les confirmations sont dédupliquées par résultat dans la session du navigateur ; les identifiants de résultat servent uniquement à cette déduplication locale et ne sont pas transmis.

Les confirmations Datafast nécessitent donc le retour du navigateur. Il n'y a plus d'événements analytiques serveur ni webhook : ce branchement ne fournit pas de collecte indépendante du navigateur ni d'attribution de revenu Stripe ; Stripe reste la référence des paiements. Aucun paiement réel n'est nécessaire pour vérifier les pages vues et les événements de l'outil.

## Déploiement et validation

La CI sur `main` ne met pas à jour le VPS. Déclencher `Build VPS image` pour le commit validé, charger l'image sur `duoshot-prod`, puis mettre à jour le service Coolify `duoshot-web` avec ce tag. Conserver le tag précédent pour le retour arrière et vérifier `/api/health`, l'accueil, `/tool` et le tableau de bord Datafast.

Les tests couvrent le consentement, une initialisation qui finit après le refus, la normalisation des pages, la déduplication des confirmations, l'échec de livraison et le filtrage du relais. La réception réelle doit être constatée séparément dans le tableau de bord Datafast, dans un navigateur normal.
