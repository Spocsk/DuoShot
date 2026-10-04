# Documentation DuoShot

Documents tenus à jour. Le déploiement et l’exploitation du VPS sont décrits dans [`infra/`](../infra/deploy.md).

| Document | Contenu |
| --- | --- |
| [`analytics.md`](analytics.md) | Politique analytics : DataFast seul outil, retrait de Mixpanel et effacement des données historiques. |
| [`datafast.md`](datafast.md) | Configuration DataFast : consentement, relais `/api/datafast/events`, événements et validation. |
| [`stripe-billing-setup.md`](stripe-billing-setup.md) | Facturation Stripe : tarifs, webhooks, conditions d’ouverture de Checkout, Pass 30 jours. |
| [`app-store-connect.md`](app-store-connect.md) | Connecteur App Store Connect (derrière `ASC_CONNECTOR_ENABLED`) : API Apple, correspondance des tailles, architecture. |
| [`ropa.md`](ropa.md) | Registre des traitements RGPD (art. 30). |
| [`commercial-learning.md`](commercial-learning.md) | Protocole d’apprentissage commercial et suivi GEO. |
| [`iphone-duo-base-connaissances.md`](iphone-duo-base-connaissances.md) | Base de connaissances iPhone Duo : tailles d’export, cadrage, fond, titre et contenu du ZIP. |
| [`raffinage-s01-screenshots-duo.md`](raffinage-s01-screenshots-duo.md) | Raffinage produit S01 des screenshots Duo : décisions, pages et contrôles bloquants. |

## Journal

[`journal/`](journal/) contient les comptes rendus datés (audits, recettes, migrations, bascule de production, vérifications, configuration Stripe live) ainsi que le plan v1 initial. Ils décrivent l’état à leur date et ne sont pas mis à jour ; en cas de contradiction, les documents ci-dessus et `infra/` font foi.
