# Datafast DuoShot

DataFast est l'unique outil d'analytics produit depuis le 4 octobre 2026 (Mixpanel retiré, voir [`analytics.md`](analytics.md)). Le SDK officiel `datafast` 3.0.18 est initialisé après le consentement statistique. Il remplace le script global ajouté dans `607f69f`, afin de contrôler les événements, les URLs et l'arrêt après retrait du consentement.

- Site : `duoshot.site`, identifiant public `dfid_DliBSHc6MXbO4ktr5mKn8`.
- SDK chargé dynamiquement ; aucun appel avant acceptation. Les refus précédents sont conservés. Une ancienne acceptation antérieure à DataFast (clé v1) demande un nouveau choix.
- Les requêtes passent par `/api/datafast/events`. Le serveur exige le cookie de consentement v2, conserve les propriétés prévues et normalise les URLs : aucun token d'invitation, identifiant de revue, paramètre de requête arbitraire, e-mail ou contenu de capture.
- Au premier chargement client, seuls les libellés `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` et `ref` de l'URL d'arrivée sont gardés en mémoire, sans nouveau cookie ni stockage local. Ils sont mis en minuscules, limités aux caractères `a-z`, `0-9`, `.`, `_`, `-` et à 64 caractères ; les valeurs reconnaissables comme e-mails ou URLs sont rejetées. Cette capture ne charge pas le SDK et n'envoie rien.
- Après acceptation (y compris un accord déjà enregistré), ces libellés accompagnent uniquement l'URL de la première page vue envoyée pendant ce chargement. Si le visiteur navigue avant d'accepter, ils accompagnent la page alors affichée. Les pages vues suivantes et les événements personnalisés restent sans query string. Un rechargement recommence la capture depuis l'URL courante ; aucun report entre chargements.
- Le relais valide à nouveau ces seuls libellés pour les pages vues. Les URLs de référence sont réduites à leur origine, y compris les références internes. Les identifiants publicitaires restent supprimés.
- Seules les routes connues sont mesurées, avec les pages publiques de dimensions, guides et outil de vérification. Les comparatifs sont limités à la liste de slugs SEO existants ; les tokens d'invitation et identifiants de revue sont remplacés par des noms de route stables.
- SDK désactivé sur localhost et pour les navigateurs automatisés selon son comportement officiel. Ne pas interpréter un test local comme une preuve de réception en production.
- Le refus appelle `optOut()`, vide la file du SDK et bloque également le relais côté serveur.

## Événements

`page_viewed` alimente les pages vues natives de Datafast. Les autres événements client existants sont transmis sous leur nom : `page_engagement`, `auth_succeeded`, `account_created`, `captures_added`, `export_requested`, `export_failed`, `zip_download_clicked`, `checkout_started`, `review_requested`, `review_failed`.

Les confirmations `export_succeeded` et `review_created` sont émises par le navigateur après une réponse de rendu réussie, y compris à la récupération d'un rendu. `subscription_activated` est émis au retour Checkout lorsque les droits Stripe Indie ou Studio sont confirmés. Les confirmations sont dédupliquées par résultat dans la session du navigateur ; les identifiants de résultat servent uniquement à cette déduplication locale et ne sont pas transmis.

Les confirmations Datafast nécessitent donc le retour du navigateur. Il n'y a plus d'événements analytiques serveur ni webhook : ce branchement ne fournit pas de collecte indépendante du navigateur ni d'attribution de revenu Stripe ; Stripe reste la référence des paiements. Aucun paiement réel n'est nécessaire pour vérifier les pages vues et les événements de l'outil.

Les visiteurs qui refusent ou ignorent le bandeau ne sont jamais comptés par DataFast. Pour eux, le compteur serveur sans cookie de la PR #75 (`daily_page_views`) reste la source des pages vues journalières et des campagnes disponibles. Le passage de DataFast à un script sans cookie et sans bandeau relève d'une décision séparée, hors du périmètre de ce correctif.

## Déploiement et validation

La CI sur `main` ne met pas à jour le VPS. Déclencher `Build VPS image` pour le commit validé, charger l'image sur `duoshot-prod`, puis mettre à jour le service Coolify `duoshot-web` avec ce tag. Conserver le tag précédent pour le retour arrière et vérifier `/api/health`, l'accueil, `/tool` et le tableau de bord Datafast.

Les tests couvrent le consentement, une initialisation qui finit après le refus, la capture en mémoire avant navigation, les libellés de campagne sur la première page vue uniquement, la normalisation des pages, la déduplication des confirmations, l'échec de livraison et le filtrage du relais. La réception réelle doit être constatée séparément dans le tableau de bord Datafast, dans un navigateur normal.
