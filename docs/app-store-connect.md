# Connecteur App Store Connect

Statut au 2026-10-04 : backend et connexion du compte livrés derrière `ASC_CONNECTOR_ENABLED`. Le bouton « Envoyer vers App Store Connect » de l’outil fera l’objet d’une PR séparée. Aucun envoi réel n’a encore été testé de bout en bout. Le marketing (DESIGN.md) ne doit donc pas encore annoncer d’envoi vers ASC.

## Ce que dit la documentation Apple (vérifiée le 2026-10-04)

| Sujet | Constat | Source |
| --- | --- | --- |
| Authentification | JWT ES256. En-tête : `alg=ES256`, `kid` (Key ID), `typ=JWT`. Charge utile : `iss` (Issuer ID), `iat`, `exp`, `aud=appstoreconnect-v1`. Un `exp` à plus de 20 min est refusé. Les clés individuelles utilisent `sub=user` et pas d’`iss` ; DuoShot ne gère que les clés d’équipe. | [Generating tokens for API requests](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests) |
| Où créer la clé | Utilisateurs et accès → Intégrations → App Store Connect API (onglet clés d’équipe). Il faut un compte Admin pour générer la clé. L’Issuer ID s’affiche en haut de la page, le Key ID dans la liste. Le fichier .p8 n’est téléchargeable qu’une fois. Une clé d’équipe donne accès à **toutes** les apps du compte, quel que soit son rôle. Le guide demande le rôle App Manager pour limiter ce qu’elle peut faire, pas les apps qu’elle peut voir. | même page ; [Creating API keys](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api) |
| Envoi d’un asset | 1) `POST /v1/appScreenshots` avec `fileName`, `fileSize` et la relation `appScreenshotSet`, qui renvoie `uploadOperations` ; 2) un PUT par opération (méthode, URL, `requestHeaders`, plage `offset`/`length`) vers des URL présignées, sans JWT ; 3) `PATCH /v1/appScreenshots/{id}` avec `uploaded=true` et `sourceFileChecksum` (MD5 du fichier entier) ; 4) relire `assetDeliveryState.state` : `AWAITING_UPLOAD` → `UPLOAD_COMPLETE` → `COMPLETE` ou `FAILED` (terminal). La réservation expire au bout d’une semaine environ. | [Uploading assets to App Store Connect](https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect) |
| Versions modifiables | `appVersionState` remplace `appStoreState`, désormais déprécié. DuoShot filtre `filter[appVersionState]` sur `PREPARE_FOR_SUBMISSION`, `DEVELOPER_REJECTED`, `REJECTED`, `METADATA_REJECTED` et `INVALID_BINARY`. | [AppVersionState](https://developer.apple.com/documentation/appstoreconnectapi/appversionstate), [List App Store versions](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-appstoreversions) |
| Ordre des captures | `PATCH /v1/appScreenshotSets/{id}/relationships/appScreenshots` | [Replace screenshots in a set](https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-appscreenshotsets-_id_-relationships-appscreenshots) |
| **Type d’affichage iPhone Duo** | **Absent.** L’énumération `ScreenshotDisplayType` ne contient que `APP_IPHONE_67/65/61/58/55/47/40/35`, les iPad, Watch, `APP_DESKTOP`, `APP_APPLE_TV`, `APP_APPLE_VISION_PRO` et `IMESSAGE_*`. Aucune valeur Duo, pliable ou « fold ». La page d’aide indique des dépôts Duo « plus tard cette année ». | [ScreenshotDisplayType](https://developer.apple.com/documentation/appstoreconnectapi/screenshotdisplaytype), [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) |
| iPhone 6,9″ | Il n’existe pas de valeur `APP_IPHONE_69`. Dans App Store Connect, l’emplacement 6,9″ est le set `APP_IPHONE_67`, qui accepte 1320×2868, 1290×2796 et 1260×2736. La documentation Apple ne le dit pas explicitement : des développeurs le signalent sur les [forums](https://developer.apple.com/forums/thread/763908). **À confirmer lors du premier envoi réel.** | — |

## Correspondance des sorties DuoShot

Tout est défini dans un seul module, `src/lib/asc/config.ts` (`ASC_DISPLAY_TYPES`) :

| Sortie DuoShot | `screenshotDisplayType` | Envoyé ? |
| --- | --- | --- |
| `duo-outer` 1398×2034 | `null` | Non : signalé dans `skipped` |
| `duo-inner` 2007×2853 | `null` | Non : signalé dans `skipped` |
| `iphone-69` | `APP_IPHONE_67` | Oui, une seule taille par set : 1320×2868 (2868×1320 en paysage) |

Conséquence : aujourd’hui, seul un export qui inclut le 6,9″ (offres Indie et Studio) a quelque chose à envoyer. Pour un export Duo seul, `POST /api/asc/uploads` répond `409 NOTHING_TO_UPLOAD`. Quand Apple publiera une valeur Duo, il suffira de la renseigner dans `ASC_DISPLAY_TYPES`, puis de la tester de bout en bout.

## Architecture

- `asc_connections` (migration `20261004190000_asc_connector.sql`) : une ligne par espace, avec RLS activé, aucune policy et aucun droit pour `anon`/`authenticated`, donc accessible au service role seulement. La clé .p8 est chiffrée par l’application en AES-256-GCM avec `ASC_ENCRYPTION_KEY` (IV aléatoire de 12 octets, tag de 16 octets, `workspace_id` lié en AAD). Elle n’est jamais renvoyée au client.
- `src/lib/asc/jwt.ts` : signature ES256 avec `node:crypto` (`dsaEncoding: ieee-p1363`, aucune dépendance ajoutée). Le jeton dure 15 min et se renouvelle 2 min avant expiration.
- `src/lib/asc/client.ts` : client typé (listApps, listEditableVersions, listLocalizations, ensureScreenshotSet, deleteExistingScreenshots, uploadScreenshot, waitForScreenshots, reorderScreenshots). Les erreurs Apple sont converties en codes stables (`ASC_UNAUTHORIZED`, `ASC_CONFLICT` pour 409, `ASC_INVALID` pour 422, etc.). Le JWT n’est jamais envoyé ailleurs qu’à `api.appstoreconnect.apple.com`, ni aux URL d’envoi, ni aux liens de pagination.
- File de rendu : nouveau type `asc_upload` dans `render_jobs`, sans réservation de quota, dans **sa propre voie** : `claim_asc_upload()` (un envoi à la fois) est indépendant de `claim_render()` (exports et reviews), et la limite d’un travail en attente par utilisateur s’applique par voie. Un envoi n’empêche donc jamais un export. Le worker autonome (`dist/render-worker.mjs`, lancé par `scripts/run-render-worker.mjs`) interroge les deux voies hors du serveur Next ; en retour arrière (`RENDER_WORKER_MODE=http`), il passe par `/api/internal/render-worker?lane=asc`.
- Au démarrage, le job vérifie de nouveau l’appartenance à l’espace, l’offre payante et, pour `replaceExisting`, le rôle owner. Il télécharge ensuite le ZIP de l’export (`export_sets.storage_path`, 24 h) et sélectionne les fichiers du set. Il envoie toutes les réservations, puis interroge Apple en parallèle (budget de 10 min). La progression par fichier passe par `report_render_progress` (protégé par le bail) et la colonne `render_jobs.progress`, que `GET /api/render-jobs/:id` renvoie.
- Les parties ne partent que par `PUT` vers un hôte HTTPS en `.apple.com`. Toute autre opération est refusée avant l’envoi du moindre octet (`ASC_UPLOAD_OPERATION_INVALID`).
- Pas de nouvel essai automatique : un envoi dont le bail expire est marqué `ASC_INTERRUPTED`, sans être remis en file. En cas d’échec, tout ce que le job a créé chez Apple est supprimé par un client distinct, sans signal d’abandon et avec un délai court, ce qui couvre aussi la perte du heartbeat.
- Un set ne dépasse jamais 10 captures. La capacité est vérifiée avant toute écriture (`ASC_SET_FULL`), en comptant aussi les captures existantes. Avec `replaceExisting` (owner seulement), les anciennes captures ne sont supprimées qu’une fois les nouvelles en état `COMPLETE`, puis le set est réordonné. Un échec laisse les anciennes captures intactes.

## Routes

| Route | Accès | Rôle |
| --- | --- | --- |
| `GET /api/asc/connection` | tout membre | Statut uniquement : `connected`, `keyId`, Issuer ID masqué, `lastVerifiedAt` |
| `POST /api/asc/connection` | owner, offre payante | Valide le PEM P-256, vérifie avec `GET /v1/apps?limit=1`, puis enregistre la clé chiffrée |
| `DELETE /api/asc/connection` | owner, toute offre | Révoque la connexion (possible même après la fin de l’abonnement) |
| `GET /api/asc/apps`, `/api/asc/apps/:id/versions`, `/api/asc/versions/:id/localizations` | membre, offre payante | Recherches pour le futur bouton de l’outil |
| `POST /api/asc/uploads` | membre, offre payante | Met un `asc_upload` en file (en-tête `Idempotency-Key`) ; le suivi passe par `/api/render-jobs/:id` |

Toutes ces routes répondent `404` tant que `ASC_CONNECTOR_ENABLED` ne vaut pas `true`. Les limites de débit `asc-connection`, `asc-upload` et `asc-read` sont définies dans `src/lib/rate-limit.ts`.

## RGPD

La suppression de l’espace ou du compte qui a fourni la clé efface `asc_connections` par cascade. L’export JSON du compte inclut seulement les métadonnées (Issuer ID, Key ID, dates), jamais la clé. Voir `docs/ropa.md`.

## Mise en production

1. Appliquer la migration `20261004190000_asc_connector.sql`.
2. Générer la clé maître avec `openssl rand -base64 32` et la placer dans `ASC_ENCRYPTION_KEY`. Si elle change, toutes les connexions deviennent illisibles (`ASC_KEY_UNREADABLE`) et doivent être recréées.
3. Vérifier que `RENDER_QUEUE_ENABLED=true` et que le worker tourne.
4. Définir `ASC_CONNECTOR_ENABLED=true`, puis lancer `node scripts/check-deployment-env.mjs`.
5. Faire un essai de bout en bout avec une app de test : export avec 6,9″, envoi, contrôle dans App Store Connect. Ensuite seulement, mettre à jour le marketing.
