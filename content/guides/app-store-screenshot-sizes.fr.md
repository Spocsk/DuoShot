---
title: "Tailles des captures App Store 2026 (avec iPhone Duo)"
description: "Toutes les tailles de captures App Store pour iPhone Duo, iPhone, iPad, Mac, Apple TV, Vision Pro et Watch, emplacements requis et CSV à télécharger."
lang: fr
slug: app-store-screenshot-sizes
alternate: /guides/app-store-screenshot-sizes
updated: 2026-11-01
published: 2026-10-16
---

# Tailles des captures App Store 2026, iPhone Duo compris

**Réponse rapide :** pour soumettre une app iPhone, App Store Connect exige au moins une capture pour l’**iPhone avec Dynamic Island (écran moyen)**, par exemple **1206 × 2622** pixels en portrait. Les apps iPad ont aussi besoin de la taille **iPad 13 pouces**, par exemple **2064 × 2752**. L’iPhone Duo (l’iPhone pliable d’Apple) utilise **1398 × 2034** pour l’écran externe et **2007 × 2853** pour l’écran interne. Apple accepte jusqu’à **10 captures par taille d’appareil**, en PNG ou JPEG opaques, sans canal alpha.

Toutes les tailles ci-dessous viennent des [spécifications de captures d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), vérifiées le 1er novembre 2026. En paysage, il suffit d’inverser les dimensions. Téléchargez le [tableau complet en CSV](/app-store-screenshot-sizes.csv).

## Qu’est-ce qui est requis, et qu’est-ce qui est optionnel ?

Pour une app iPhone ou iPad, App Store Connect n’exige que deux tailles : l’iPhone avec Dynamic Island (écran moyen) et, si l’app tourne sur iPad, l’écran iPad 13 pouces. Les apps Mac, Apple TV, Apple Vision Pro et Apple Watch ont chacune leur propre taille requise. Toutes les autres tailles iPhone et iPad sont optionnelles, car App Store Connect réduit vos captures pour les appareils plus petits quand l’interface est identique.

| Emplacement | Requis ? | Tailles portrait acceptées |
| --- | --- | --- |
| iPhone avec Dynamic Island (écran moyen) | Requis pour les apps iPhone | 1206 × 2622, 1179 × 2556 |
| iPad écran 13″ | Requis si l’app tourne sur iPad | 2064 × 2752, 2048 × 2732 |
| iPhone Duo | Requis à partir d’avril 2027 pour les apps utilisant le SDK iOS 27.1 ou ultérieur | 1398 × 2034 (externe), 2007 × 2853 (interne) |
| Mac | Requis pour les apps Mac | 1280 × 800, 1440 × 900, 2560 × 1600, 2880 × 1800 (paysage, 16:10) |
| Apple TV | Requis pour les apps Apple TV | 1920 × 1080, 3840 × 2160 (paysage) |
| Apple Vision Pro | Requis pour les apps Vision Pro | 3840 × 2160 (paysage) |
| Apple Watch | Requis pour les apps Watch | Une taille Watch, voir plus bas |

## Tailles des captures iPhone Duo

L’iPhone Duo a deux écrans : App Store Connect accepte donc deux familles de tailles dans un seul emplacement iPhone Duo.

| Écran | Portrait | Paysage |
| --- | --- | --- |
| Écran externe | 1398 × 2034 | 2034 × 1398 |
| Écran interne | 2007 × 2853 | 2853 × 2007 |

Le 5 octobre 2026, Apple a annoncé que l’iPhone Duo serait disponible à partir du 23 octobre 2026. Dans son [actualité développeurs sur l’iPhone Duo](https://developer.apple.com/news/?id=kkphp5qo), Apple indique qu’à partir d’avril 2027, les apps et jeux soumis devront inclure des captures iPhone Duo. La page des spécifications précise la condition : les captures seront requises pour toute app utilisant le SDK iOS 27.1 ou ultérieur. Les apps qui fournissent des captures Duo affichent un badge sur leur page produit indiquant qu’elles sont optimisées pour l’iPhone Duo.

L’écran interne se plie en son milieu. Éloignez les titres et les commandes importantes de la pliure pour qu’ils restent lisibles. Voir la [page de l’écran externe](/1398x2034), la [page de l’écran interne](/2007x2853) et le [guide de dépôt manuel](/guides/iphone-duo-app-store-connect).

## Tailles des captures iPhone

| Emplacement | Exemples d’appareils | Tailles portrait |
| --- | --- | --- |
| Dynamic Island, grand écran | iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | 1320 × 2868, 1290 × 2796, 1260 × 2736 |
| Dynamic Island, écran moyen (requis) | iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | 1206 × 2622, 1179 × 2556 |
| Face ID, grand écran | iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | 1284 × 2778, 1242 × 2688 |
| Face ID, écran moyen | iPhone 17e, 16e, 14, 13 Pro, 13, 13 mini, 12 Pro, 12, 12 mini, 11 Pro | 1170 × 2532, 1125 × 2436, 1080 × 2340 |
| Bouton principal, grand écran | iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus | 1242 × 2208 |
| Bouton principal, écran moyen | iPhone SE (3e, 2e gén.), 8, 7, 6s, 6 | 750 × 1334 |

Si vous ne remplissez pas l’emplacement grand écran Dynamic Island, App Store Connect utilise des captures réduites de l’emplacement Face ID grand écran, et inversement. En pratique, la plupart des équipes déposent le jeu **1206 × 2622** requis et, en option, un jeu **1320 × 2868**. Voir la [page 1206 × 2622](/1206x2622) et la [page 1320 × 2868](/1320x2868).

## Tailles des captures iPad

| Emplacement | Exemples d’appareils | Tailles portrait |
| --- | --- | --- |
| Écran 13″ (requis pour les apps iPad) | iPad Pro (M5, M4), iPad Pro (6e, 5e, 4e, 3e, 1re gén.), iPad Air (M4, M3, M2) | 2064 × 2752, 2048 × 2732 |
| Écran 12,9″ | iPad Pro (2e gén.) | 2048 × 2732 |
| Écran 11″ | iPad Pro (M5, M4), iPad Pro (4e, 3e, 2e, 1re gén.), iPad Air (M4, M3, M2), iPad Air (5e, 4e gén.), iPad (A16), iPad (10e gén.), iPad mini (A17 Pro), iPad mini (6e gén.) | 1488 × 2266, 1668 × 2420, 1668 × 2388, 1640 × 2360 |
| Écran 10,5″ | iPad Pro, iPad Air (3e gén.), iPad (9e, 8e, 7e gén.) | 1668 × 2224 |
| Écran 9,7″ | iPad Pro, iPad Air, iPad Air 2, iPad (6e, 5e, 4e, 3e gén.), iPad mini (5e gén.), iPad mini 4 | 1536 × 2048, 768 × 1024 (et versions sans barre d’état) |

## Mac, Apple TV, Vision Pro et Apple Watch

- **Mac :** au choix 1280 × 800, 1440 × 900, 2560 × 1600 ou 2880 × 1800, toutes en 16:10.
- **Apple TV :** 1920 × 1080 ou 3840 × 2160.
- **Apple Vision Pro :** 3840 × 2160.
- **Apple Watch :** au choix 422 × 514 (Ultra 4, Ultra 3), 410 × 502 (Ultra 2, Ultra), 416 × 496 (Series 12, 11, 10), 396 × 484 (Series 9, 8, 7), 368 × 448 (Series 6, 5, 4, SE) ou 312 × 390 (Series 3, 2, 1). Gardez la même taille Watch pour toutes les langues.

## Les règles de format qui bloquent le dépôt

- Les fichiers doivent être en `.png`, `.jpg` ou `.jpeg`.
- Les images ne peuvent contenir ni canal alpha ni transparence. Un PNG exporté avec transparence est refusé même si les pixels semblent opaques.
- Les dimensions doivent correspondre exactement à une taille acceptée. Un pixel d’écart suffit à un refus.
- Chaque emplacement accepte de 1 à 10 captures.
- Le contenu doit respecter les règles de validation de l’App Store : les captures doivent montrer l’app en usage, c’est pourquoi DuoShot part de vos vraies captures.

Notre [vérificateur gratuit](/tools/iphone-duo-screenshot-checker) contrôle les dimensions et la transparence dans votre navigateur, sans envoyer de fichier. Si Apple a déjà rejeté vos captures, lisez le [décodeur de rejet](/rejet).

## La place de DuoShot

DuoShot exporte des captures sans cadre pour les écrans externe et interne de l’iPhone Duo, la taille 6,3″ requise et la taille 6,9″ optionnelle, dans un seul ZIP. L’essai gratuit comprend 2 ZIP HD avec les captures Duo et la taille 6,3″ requise. Le format 6,9″ est disponible avec Pass, Indie et Studio. DuoShot ne couvre pas aujourd’hui les tailles iPad, Mac, Apple TV, Vision Pro ni Watch. Pour d’autres outils, consultez le [comparatif des générateurs de captures](/guides/best-app-store-screenshot-generator).

iOS 27 ajoute des [creative assets](/guides/app-store-creative-assets) — un bandeau de fiche et un visuel de résultats de recherche — au-dessus de vos captures ; ils sont distincts et ne changent pas les tailles présentées ici.

[Préparez vos captures](/tool) ou consultez la [page complète des spécifications](/specs).
