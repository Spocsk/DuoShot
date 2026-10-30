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
catégorie, le format (PNG/JPEG), les dimensions pixel-exactes (`minWidth == maxWidth`
et `minHeight == maxHeight`), l’absence de canal alpha (les specs capture ont
`alphaAllowed:false`), la version `PREPARE_FOR_SUBMISSION` et la capacité
avant toute réservation ou écriture. La capacité compte les placements existants
et les nouveaux, y compris en remplacement. La limite Duo vient de
`groupLimits.maxCount` ; sans limite pour ce groupe, le garde local reste
`DUO_SLOT_MAX` (10). Sans refData, ce garde s’applique aussi, mais un envoi Asset
Library ne peut pas continuer sans résoudre les groupes et specs. Une sélection
trop grande donne `DUO_SLOT_LIMIT`, sans troncature ; un groupe déjà trop rempli
donne `ASC_SET_FULL`.

## Identifiants Duo réels (refData)

Lus le 2026-10-30 via `GET /v1/appAssetLibraryRefData` sur une clé d’équipe
réelle (réponse sans secret). Ils remplacent les specIds fictifs des fixtures :

- Groupe Duo `APP_SCREENSHOT` : `placementProfileGroupId` **`IPHONE_DUO_PROFILE`**,
  `displayClassId` **`IPHONE_DUO`**, `platform` **`IPHONE_APP_STORE`**.
- Quatre `imageSpecs` Duo (dimensions exactes, `png`/`jpeg`, alpha interdit) :
  - `47d5a794-c036-4342-8923-988990c81af9` — 2034×1398 (externe, paysage)
  - `205e7ab6-a23a-4ee2-b327-0a99ec2a2520` — 1398×2034 (externe, portrait)
  - `b83915b8-5b87-4e63-bba5-ab3a0c439862` — 2853×2007 (interne, paysage)
  - `5d458eef-8339-4a1f-a484-83d53834cfec` — 2007×2853 (interne, portrait)
- `displayClass` `IPHONE_DUO` `screenDimensions` = `["2853x2007","2034x1398"]` :
  deux tailles **acceptées**, aucune n’est requise en double.
- `groupLimits` `APP_SCREENSHOT` : une seule entrée dont `groupIds` liste tous les
  groupes iPhone/iPad/Duo avec `maxCount` 10. Le code lit cette entrée comme
  « 10 par groupe listé » (voir plus bas, point non prouvé).

Le fichier brut (`/workspace/asc-probe/refdata-real-2026-10-30.json`) n’était pas
lisible depuis le bac à sable de travail ; ces valeurs proviennent de la lecture
relayée de cette réponse. Les champs du parseur ont par ailleurs été confirmés un
à un contre la référence de schéma Apple (OpenAPI 4.5.1) : `features[].placementType`,
`placementTypes[].placementTypeId`, `specMappings[].placementGroupId/specs`,
`groupLimits[].groupIds/maxCount`, `displayClasses[].screenDimensions` (tableau de
chaînes) et `placementProfileGroups[].placementProfileGroupId/platform/displayClassId`.

## Essai réel : `scripts/asc-live-smoke.mjs`

Script Node 24 qui rejoue le flux Asset Library de bout en bout **avec le code de
la PR** (empaqueté à la volée par esbuild — ni JWT ni HTTP réécrits). Lit
`ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY` (reconstruit le PEM en lignes de
64 caractères si besoin) et n’affiche jamais ces valeurs ni le JWT (le journal ne
montre que méthode + hôte + chemin + code HTTP). Garde-fous codés en dur :
`bundleId` limité à `com.spocsk.PoseLock`, version obligatoirement
`PREPARE_FOR_SUBMISSION`, jamais de création de version ni de soumission, et
suppression limitée à ce que le script a lui-même créé. `--dry-run` reste en
lecture seule ; `--cleanup` (défaut) supprime l’image et le placement créés puis
vérifie leur disparition. Non encore exécuté contre Apple en écriture.

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

- **`groupLimits` partagé ou par groupe.** La refData réelle expose une seule
  entrée dont `groupIds` liste tous les groupes iPhone/iPad/Duo avec `maxCount`
  10. Le code lit cela comme « 10 par groupe listé » (cohérent avec la règle
  historique de 10 captures par type d’affichage, et avec le fait absurde que
  iPhone et iPad partageraient sinon un seul pool de 10). Si Apple traitait
  l’entrée comme un pool partagé entre les groupes listés, la vérification de
  capacité par groupe sous-compterait ; l’essai réel doit trancher.
- L’état prêt : le guide des images annonce `PREPARE_FOR_SUBMISSION` ; l’enum
  OpenAPI et le guide commun mentionnent aussi `COMPLETE`. Les deux sont acceptés.
- Le rôle minimal de la clé : le guide de la bibliothèque cite Account Holder,
  Admin et App Manager ; les permissions effectives restent à vérifier.
- Le groupe 6,9″ réel pour 1320×2868 et 2868×1320. Cette lecture Duo ne couvrait
  pas le groupe 6,9″ ; son identifiant et ses specs restent illustratifs dans les
  fixtures (la spec documentée 1290×2796 ne prouve pas la correspondance).
- Le comportement de l’ordering request : ordre effectif après lecture triée par
  `placementGroupPosition`, prise en compte des anciens placements et
  conservation de l’ordre après leur suppression.

Points désormais confirmés (contre la refData réelle ou la référence de schéma
Apple) : le groupe Duo `IPHONE_DUO_PROFILE`, les quatre specIds Duo, la forme des
six tableaux de la refData, le classement externe/interne des tailles, le commit
Asset Library par `uploaded:true` seul (sans `sourceFileChecksum`) et la
suppression des placements avant l’image.

Les tests unitaires utilisent exclusivement un faux Apple en mémoire. Aucun envoi
Apple réel n’a encore été effectué ; `scripts/asc-live-smoke.mjs` est l’outil
prévu pour le faire.
