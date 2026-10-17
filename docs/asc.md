# Modèles d’envoi App Store Connect

`ASC_UPLOAD_MODEL` choisit le modèle côté serveur. La valeur `asset-library`
active l’App Asset Library. La valeur `legacy`, une valeur absente ou toute autre
valeur conserve le flux historique. Ce réglage n’active pas le connecteur :
`ASC_CONNECTOR_ENABLED` reste désactivé en production.

Le modèle `legacy` utilise `appScreenshotSets` et `appScreenshots`, dépréciés
dans l’API Apple 4.5.1. Son commit envoie encore le checksum MD5.

Le modèle `asset-library` lit la refData à chaque job. Il résout le groupe Duo
depuis `IPHONE_DUO` et le groupe 6,9″ depuis les dimensions du fichier. Aucun
nom de groupe ni specId n’est fixé dans le code de production. Il vérifie la
catégorie, les specs exactes, la version `PREPARE_FOR_SUBMISSION` et la capacité
avant toute écriture. La capacité compte les placements existants et les nouveaux,
y compris en remplacement. La limite Duo vient de `groupLimits.maxCount` ; sans
limite pour ce groupe, le garde local reste `DUO_SLOT_MAX` (10). Sans refData,
ce garde s’applique aussi, mais un envoi Asset Library ne peut pas continuer sans
résoudre les groupes et specs. Une sélection trop grande donne `DUO_SLOT_LIMIT`,
sans troncature ; un groupe déjà trop rempli donne `ASC_SET_FULL`.

Chaque image est réservée dans la bibliothèque de l’app, envoyée par parties
en HTTPS PUT vers un hôte `.apple.com`, sans JWT, puis engagée avec
`uploaded: true` seul. Le worker attend `PREPARE_FOR_SUBMISSION` ou `COMPLETE`,
et compare le specId reçu à celui attendu depuis les dimensions. `FAILED` et
le dépassement du délai interrompent le job. Les détails Apple et les diagnostics
de spec restent côté serveur ; le résultat public contient un code stable.

Une fois toutes les images vérifiées, le worker crée les placements et envoie
une demande d’ordre par groupe, dans l’ordre conservé par `duo-slot.json`.
En ajout, les anciens placements précèdent les nouveaux. En remplacement, les
nouveaux précèdent temporairement les anciens ; les anciens sont supprimés après
réussite de toutes les demandes d’ordre. Avant ce point, un échec supprime les
placements créés par le job, puis ses images, même après abandon du signal.
Les anciens assets ne sont pas supprimés : ils peuvent servir à d’autres surfaces.
Après ce point, un échec de suppression laisse les nouveaux en place et signale
`reordered: false`. Une erreur d’enregistrement du résultat conserve les nouveaux
assets et renvoie `ASC_RETRY_UNSAFE` pour éviter un nouvel envoi en double.

## Sources Apple

- [Migration vers l’App Asset Library](https://developer.apple.com/documentation/appstoreconnectapi/migrating-to-the-app-asset-library)
- [Découverte des spécifications](https://developer.apple.com/documentation/appstoreconnectapi/discovering-asset-specifications)
- [Envoi et gestion des images](https://developer.apple.com/documentation/appstoreconnectapi/uploading-and-managing-image-assets)
- [Placements et ordre](https://developer.apple.com/documentation/appstoreconnectapi/placing-assets-on-your-app-store-surfaces)
- [Modèle de l’App Asset Library](https://developer.apple.com/documentation/appstoreconnectapi/understanding-the-app-asset-library)
- [Envoi d’assets, guide commun au flux historique](https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect)
- [Spécification OpenAPI Apple](https://developer.apple.com/documentation/appstoreconnectapi/download-and-read-the-openapi-specification) : schémas et chemins de la version 4.5.1. L’extrait local fourni provient de la copie du CLI App Store Connect (`docs/openapi/latest.json`, révision `1f98949`).

## Ce qui reste à prouver par l’essai réel

- Le nom réel du placement group Duo pour `APP_SCREENSHOT`. Le groupe Duo des fixtures est fictif.
- Les specIds Duo réels, dont le classement de 2007×2853 comme écran interne. Ce classement repose ici sur `SIZE_SPECS` de DuoShot.
- Les `groupLimits` Duo : maximum de 10 partagé entre externe et interne, ou autre règle.
- L’état prêt : le guide des images annonce `PREPARE_FOR_SUBMISSION`, tandis que l’enum OpenAPI et le guide commun mentionnent aussi `COMPLETE`. Les deux sont acceptés.
- Le rôle minimal de la clé : le guide de la bibliothèque cite Account Holder, Admin et App Manager ; les permissions effectives restent à vérifier sur une clé d’équipe.
- Le groupe 6,9″ réel pour 1320×2868 et 2868×1320. Le groupe illustré par Apple et la spec documentée 1290×2796 ne prouvent pas cette correspondance.
- Le comportement de l’ordering request : ordre effectif après lecture triée par `placementGroupPosition`, prise en compte des anciens placements et conservation de l’ordre après leur suppression.

Les tests utilisent exclusivement un faux Apple en mémoire. Aucun envoi Apple réel
n’a été effectué pour cette migration.
