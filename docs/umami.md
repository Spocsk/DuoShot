# Umami DuoShot

Umami v3.0.3, auto-hébergé chez Hetzner en Allemagne, est l’outil d’analytics produit. Site : `duoshot.site`, identifiant public `182b11a4-f44b-4dcf-8f07-448e8ef493c4`.

Les données de mesure d’audience Umami ne sont rattachées à aucun compte ni à aucune personne identifiée ; elles sont conservées 25 mois, puis supprimées automatiquement.

Note opérationnelle : Umami auto-hébergé conserve tout indéfiniment par défaut ; la suppression automatique à 25 mois exige une tâche planifiée sur l’hôte Umami, supprimant les lignes de plus de 25 mois dans `event_data`, `website_event`, `session_data`, `revenue`, puis `session`, dans cet ordre, à mettre en place côté infra avec l’accord de Dylan.

## Consentement et transport

Le bandeau, les choix et la clé `duoshot_analytics_choice_v2` restent inchangés. Aucun script ni envoi navigateur avant acceptation. Les anciens refus sont conservés ; une ancienne acceptation v1 demande un nouveau choix. Le choix est conservé en stockage local ; le cookie de consentement a une durée d’un an. Umami ne pose aucun cookie. Au refus, `umami.disabled=1` est enregistré localement et tous nos appels cessent ; une acceptation supprime cette clé.

Le script est injecté après accord via `/u/script.js`, réécrit vers l’hôte Umami. Il utilise `data-auto-track=false` et `data-domains=duoshot.site`. L’attente du tracker est limitée à deux secondes et échoue silencieusement. Le navigateur ne contacte jamais directement l’hôte Umami : le tracker poste vers `/api/umami/api/send`. La CSP reste inchangée.

Le relais exige le cookie de consentement v2 accepté, limite le corps à 16 Kio, valide le site et le domaine, puis filtre 13 noms d’événements et 11 propriétés. Il transmet le User-Agent et l’IP cliente résolue par la même fonction que le rate limiter, dans `X-Forwarded-For`, `X-DuoShot-Client-IP` et `True-Client-IP`, avec un délai maximal de deux secondes. Les erreurs sont confinées aux analytics.

## Pages, campagnes et événements

Les pages vues sont manuelles, sans nom d’événement Umami. Les routes connues sont normalisées, notamment `/r/[id]` et `/invite/[token]`, en gardant le préfixe anglais. Aucun titre de page privé n’est envoyé. Les referrers sont réduits à leur origine.

Avant toute navigation, seuls les libellés nettoyés `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` et `ref` sont capturés en mémoire, sans livraison ni persistance. Minuscules, caractères `a-z`, `0-9`, `.`, `_`, `-`, 64 caractères maximum ; les e-mails et URLs reconnaissables sont rejetés. Après accord, ces libellés accompagnent uniquement la première page vue de ce chargement. Les événements et pages suivantes sont sans query string. Le relais applique de nouveau ces règles.

Les 14 noms produit et leurs propriétés sont conservés (voir [`analytics.md`](analytics.md)). Les conversions `export_succeeded`, `review_created` et `subscription_activated` sont dédupliquées avec `sessionStorage duoshot_umami:<event>:<id>`. Les identifiants ne sont jamais transmis. Chaque événement porte `audience` ; `identify({ audience })` renseigne aussi les données de session, sans ID distinct, après les changements d’audience. Aucun contenu de capture, e-mail, nom de fichier ou identifiant privé n’est envoyé.

## Revenu et validation

Après traitement réussi et insertion du marqueur `stripe_events`, le webhook envoie `payment_succeeded` uniquement en mode réel : factures payées de montant positif (montant / 100, devise, offre, intervalle, motif, audience du propriétaire) et Pass payé et lié (montant / 100, devise, offre, audience). Les sessions Checkout en mode abonnement ne comptent pas le revenu. Un doublon d’`event.id`, y compris un conflit d’insertion concurrente, n’envoie rien. Aucun ID Stripe, e-mail ou ID de workspace ne quitte le serveur.

Cette mesure serveur est indépendante du consentement navigateur et ne fournit pas d’attribution par visiteur ; aucune métadonnée d’acquisition n’est ajoutée. Stripe reste la référence comptable. Le délai maximal de deux secondes et les exceptions Umami ne changent jamais la réponse du webhook.

Les visiteurs sans accord ne sont pas mesurés côté navigateur ; le compteur serveur sans cookie `daily_page_views` reste en place. Les tests unitaires couvrent consentement, chargement tardif, normalisation, campagnes, audience, déduplication, relais et revenu. Cypress remplace le script par un faux tracker local : le vrai filtre de domaine empêcherait la livraison sur localhost et le réseau est indisponible en CI.

Après déploiement, vérifier la réception réelle depuis un navigateur normal et la distinction des visiteurs derrière Traefik. Si les visiteurs restent fusionnés en production, configurer `CLIENT_IP_HEADER=x-duoshot-client-ip` sur le service Umami (solution infra à valider par Dylan). Les changements d’infrastructure, de version et les rapports dans l’interface Umami restent à effectuer séparément. Conserver le tag précédent de l’image pour le retour arrière.
