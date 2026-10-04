# Stripe live — préparation du 3 octobre 2026

La demande porte sur le remplacement de la configuration Stripe de test par la
configuration live du site `https://duoshot.site`.

## État vérifié

- Compte connecté : **Tech Master**, `acct_1UExSIE1mQ8ivmXy`, mode live.
- Avant l'installation, le VPS `178.104.185.75` n'avait aucune clé Stripe ni
  aucun tarif configuré. La configuration live est maintenant installée dans
  `/data/duoshot/app.env` (mode `0600`). Le contrôle n'a consigné ni affiché la
  valeur de la clé ou du secret webhook.
- Le conteneur `web` a été recréé avec la même image immuable et est sain. Il a
  chargé une clé live, le secret webhook et les quatre tarifs live.
- La sauvegarde privée de l'environnement précédent est
  `/data/duoshot/app.env.before-stripe-20261003T214345Z` (mode `0600`). Le fichier
  temporaire envoyé pour l'installation a été supprimé du VPS.
- La configuration locale `.env.local` contient toujours les identifiants de test.
- La base de production ne contient aucun lien client/abonnement Stripe et aucune
  tentative Checkout. Aucun rendu n'était en attente ou actif lors du contrôle.
- Après l'installation, `/api/health` répond `{status: "ok"}` et
  `/api/billing/availability` répond `{checkoutAvailable: false}`.

## Ressources live créées et relues dans Stripe

| Offre | Montant | Produit | Tarif |
| --- | --- | --- | --- |
| Indie mensuel | 12 EUR/mois | `prod_VNKwDbgzNNSCHp` | `price_1UMaGFE1mQ8ivmXyQ30MNQEr` |
| Indie annuel | 120 EUR/an | `prod_VNKwDbgzNNSCHp` | `price_1UMaIDE1mQ8ivmXySNSIeJE0` |
| Studio mensuel | 49 EUR/mois | `prod_VNKwFGEVYvZyNF` | `price_1UMaGQE1mQ8ivmXyIncd0QlV` |
| Studio annuel | 490 EUR/an | `prod_VNKwFGEVYvZyNF` | `price_1UMaIPE1mQ8ivmXy3tmGXomQ` |

Les quatre tarifs sont actifs et `livemode=true`. Le comportement fiscal
`inclusive` reprend celui des tarifs de test ; cela ne valide pas une inscription
fiscale. Stripe Tax reste désactivé.

Webhook live actif : `we_1UMaJbE1mQ8ivmXy986ligqX`, destination
`https://duoshot.site/api/stripe/webhook`, version `2026-08-26.dahlia`, identique à
celle du SDK Stripe installé. Événements :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Portail live par défaut : `bpc_1UMaM6E1mQ8ivmXyYMmR8eoT`, actif. Il permet la
consultation des factures, la mise à jour des coordonnées et moyens de paiement,
et la résiliation en fin de période. Les liens renvoient vers les pages DuoShot et
le retour par défaut vers `/account`. Les changements d'offre restent désactivés :
le contrôle automatique des autorisations a refusé leur activation avec
facturation immédiate, hors du périmètre explicite du remplacement des clés.

## Installation et état des paiements

La clé live, le secret du webhook live et les quatre identifiants de tarif sont
installés côté serveur. Le fichier temporaire de transfert a été supprimé après
vérification. Les variables ne sont pas copiées dans la configuration locale de
développement ; aucun secret n'est consigné dans cette documentation.

La configuration effective du web est `/data/duoshot/app.env`, mode `0600`.
Compose la charge en format raw depuis
`/data/coolify/services/i9qtpe5bpyig86s1aljxr5gv/docker-compose.yml` ; le service
s'appelle `web`, le conteneur `web-i9qtpe5bpyig86s1aljxr5gv`. Les clés serveur sont
lues à l'exécution. Hosted Checkout n'utilise pas de clé publique Stripe.

`STRIPE_CHECKOUT_ENABLED=false` et `STRIPE_LIVE_ENABLED=false` restent en place.
Aucun paiement réel n'a été créé ni exécuté, et aucune livraison du webhook n'a
été simulée. Les appels santé et disponibilité après redémarrage confirment que
le site fonctionne et que Checkout est toujours fermé. Valider le flux de
paiement et les webhooks en environnement test isolé, confirmer les obligations
fiscales et la disponibilité du compte avant d'ouvrir Checkout aux vrais clients.
Stripe interdit d'utiliser des cartes réelles pour tester en mode live.

## Mise à jour — 4 octobre 2026

En production, `/api/billing/availability` répond désormais
`{checkoutAvailable: true}` : Checkout a été ouvert aux clients le 4 octobre 2026,
sans achat réel de contrôle au préalable.

Reste à faire :

- un achat réel suivi d'un remboursement, effectués par le propriétaire du compte ;
- la validation fiscale et la décision sur l'activation de Stripe Tax (toujours
  désactivé) ;
- l'offre ponctuelle Pass 30 jours, ajoutée par la PR #21, reste masquée tant que
  `STRIPE_PRICE_PASS30` n'est pas renseignée (voir
  [`stripe-billing-setup.md`](../stripe-billing-setup.md)).
