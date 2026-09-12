# iPhone Duo — base de connaissances (v1.0)

Source d’exécution : kickoff DuoShot + plan v1 (12 sept. 2026). Les MD uploadés d’origine peuvent être absents d’une VM fraîche ; cette fiche fige les pixels d’étagère.

## Produit

DuoShot compose des screenshots **frameless** pour l’App Store. Pitch : « Tes screenshots Duo, justes, en 3 minutes. Sans device. »

Hinge = interaction ; regions = layout. Ici on mappe des **pixels d’étagère**, pas l’angle de charnière.

v1 exporte une **étagère séparée** (un fichier par dalle), pas de fenêtre boxed, pas de chassis 2D/3D.

## Tailles

| Surface | Pouces | Portrait | Paysage |
| --- | --- | --- | --- |
| Duo outer | 5,4″ | 1398×2034 | 2034×1398 |
| Duo inner | 7,6″ | 2007×2853 | 2853×2007 |
| iPhone 6,9″ (Indie/Studio) | 6,9″ | 1320×2868 | 2868×1320 |
| iPhone 6,9″ | 6,9″ | 1290×2796 | 2796×1290 |
| iPhone 6,9″ | 6,9″ | 1260×2736 | 2736×1260 |

Une orientation par set. PNG-24 défaut, JPEG q90 option. RGB, pas d’alpha, pixels exacts (contrôles bloquants).

## Fit / fond / titre

- Fit : contain / cover / smart (attention Sharp)
- Fond : uni / dégradé / flou
- Titre + sous-titre optionnels, 2 positions (haut/bas), 2 polices (sans/serif)

## ZIP

`AppName/{duo-outer,duo-inner,iphone-69}-{portrait\|landscape}/` + `README.txt`.

Free : README marqué DuoShot. Studio : préfixe `client-slug/`. 6,9″ : sous-dossiers `{largeur}x{hauteur}`.

Cap 10 images, warning < 3. Rétention Storage 24 h.

## Hors scope v1

Frames device, Apple Sign In, tent/clock, vidéos, Connect upload, A/B, API publique, CMP analytics.
