---
title: "Creative assets App Store : tailles (iOS 27)"
description: "Spécifications des creative assets App Store : bandeau 3840 × 1646, résultats de recherche 3:2, vidéo 5–30 s et règles de contenu d’Apple."
lang: fr
slug: app-store-creative-assets
alternate: /guides/app-store-creative-assets
updated: 2026-11-11
published: 2026-11-11
---

# Creative assets App Store (iOS 27) : spécifications du bandeau de fiche et des résultats de recherche

Depuis iOS 27 et iPadOS 27, l’App Store affiche deux nouveaux visuels au-dessus de vos captures et aperçus : un **bandeau de fiche** (product page header) et un **visuel de résultats de recherche** (search results asset). Apple les appelle des creative assets. Contrairement aux captures, ils n’ont pas à montrer l’app en cours d’utilisation : Apple indique que vous pouvez les utiliser pour mettre en avant votre marque, vos offres saisonnières ou vos nouveautés.

Ils ne remplacent rien. Vos captures et aperçus restent requis et apparaissent toujours sous le bandeau.

Tout ce qui suit provient de la [spécification des creative assets d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications) (aide App Store Connect), vérifiée le 11 novembre 2026.

## Réponse rapide

| Emplacement | Ratio | Taille d’image | Formats |
| --- | --- | --- | --- |
| Bandeau de fiche | 21:9 | 3840 × 1646 px | .jpeg, .jpg, .png |
| Résultats de recherche | 3:2 | min 1920 × 1280, max 3840 × 2560 px | .jpeg, .jpg, .png |
| Visuel universel (bandeau + recherche) | 16:9 | 5244 × 2950 px | .png |

Les images ne peuvent pas contenir de canal alpha ni de transparence.

## Spécifications vidéo

| Emplacement | Ratio | Résolution | Fréquence d’images | Durée | Formats |
| --- | --- | --- | --- | --- | --- |
| Bandeau de fiche | 21:9 | 3840 × 1646 px | 30 ou 60 ips | 5–30 s | .mov, .m4v, .mp4 |
| Résultats de recherche | 3:2 | 1920 × 1280 à 3840 × 2560 px | 30 ou 60 ips | 5–30 s | .mov, .m4v, .mp4 |

Les vidéos sont lues en boucle. Elles sont muettes par défaut dans les deux emplacements. Sur la fiche, les visiteurs peuvent les activer ; dans les résultats de recherche, non.

## Cartes d’In-App Events (même famille)

| Emplacement | Ratio | Taille | Taille de fichier max | Durée vidéo |
| --- | --- | --- | --- | --- |
| Carte d’événement | 16:9 | 1920 × 1080 à 3840 × 2160 px | 500 Mo | 15–30 s |
| Page de détails de l’événement | 9:16 | 1080 × 1920 à 2160 × 3840 px | 500 Mo | 15–30 s |

## Bandeau, résultats de recherche ou visuel universel

- **Bandeau** : la première chose qu’un visiteur voit sur votre fiche. Conseil d’Apple : « concentrez-vous sur une seule idée claire » et pensez à un visiteur qui découvre l’app.
- **Résultats de recherche** : la première chose que les gens voient dans l’onglet Recherche, avant d’arriver sur votre fiche. Conseil d’Apple : « énoncez l’évidence » et montrez l’interface, le contenu ou le gameplay. Si vous n’en fournissez pas, vos in-app events, aperçus et captures apparaissent dans la recherche, comme avant.
- **Visuel universel (16:9, 5244 × 2950 PNG)** : un seul fichier utilisable à la fois pour le bandeau et les résultats de recherche. Dans App Store Connect, l’option « Utiliser le visuel du bandeau dans les résultats de recherche » n’est disponible que pour les visuels universels.

Apple publie des gabarits pour Figma, Sketch, Photoshop et Pixelmator avec une **zone de sécurité**. Gardez le texte et votre point focal à l’intérieur : le visuel est recadré différemment selon les appareils et les orientations.

## Règles de contenu listées par Apple

D’après la page App Store Asset Best Practices d’Apple :

- Pas de prix, de remises, d’URL de site ni de symboles de copyright.
- Pas de distinctions Apple (Editor’s Choice, App of the Day, Game of the Day, Apple Design Award).
- Pas d’affirmations invérifiables, comme des récompenses que vous n’avez pas reçues.
- Pas de logos ni de références à d’autres plateformes ou boutiques.
- Le contenu doit respecter une **classification 4+**, même si votre app est classée plus haut.
- Si vous utilisez du texte, limitez-vous à une courte phrase et localisez-la pour chaque langue prise en charge par votre app.

## Où les déposer dans App Store Connect

- Ouvrez votre app, puis la version de l’app sous la plateforme.
- Dans **Product Page Information**, ouvrez l’onglet **Header and Search Results**.
- Choisissez **Header** ou **Search Results**, glissez votre image ou vidéo dans la zone prévue, ou cliquez sur **Browse Assets** pour réutiliser un visuel approuvé depuis l’**Asset Library**.
- Utilisez **Preview** pour vérifier le rendu sur iPhone et iPad, dans les deux orientations et dans chaque langue.
- Soumettez la version pour validation. Les visuels sont publiés lorsque cette version est diffusée.

Deux détails utiles tirés de l’aide d’Apple :

- Vous pouvez soumettre des creative assets **seuls** depuis l’Asset Library, sans nouvelle version de l’app. Ils sont examinés par rapport à votre dernière version.
- Si votre version actuelle est déjà en ligne, vous pouvez remplacer un creative asset par un visuel **approuvé** et cliquer sur **Publish** sans soumettre de nouvelle version.

Les creative assets fonctionnent aussi sur les fiches produit personnalisées et peuvent faire l’objet d’un test A/B via l’optimisation de la fiche produit.

## Liste de vérification avant dépôt

- Bandeau exactement 3840 × 1646 (ou universel 5244 × 2950 PNG)
- Visuel de recherche entre 1920 × 1280 et 3840 × 2560, en 3:2
- Aucun canal alpha (sur Mac, vérifiez avec sips -g hasAlpha)
- Texte clé et sujet à l’intérieur de la zone de sécurité du gabarit
- Ni prix, ni URL, ni ©, ni récompense Apple, ni logo concurrent
- Texte localisé pour chaque langue de l’App Store
- Vidéo de 5 à 30 s, 30 ou 60 ips, lisible sans le son

## La place de DuoShot (honnêtement)

DuoShot ne crée pas les creative assets aujourd’hui. Il exporte les **captures** qu’App Store Connect exige toujours, y compris les groupes d’affichage de l’iPhone Duo (1398 × 2034 écran externe, 2007 × 2853 écran interne), sans cadre et aux dimensions exactes d’Apple. Un bandeau ne peut pas les remplacer : vos captures s’affichent juste en dessous sur la fiche produit.

## Guides liés

- [Tailles de captures App Store](/guides/app-store-screenshot-sizes)
- [Spécifications des aperçus vidéo](/guides/app-preview-specifications)
- [Règles des captures App Store](/guides/app-store-screenshot-guidelines)
- [Taille de capture iPhone Duo](/guides/screenshot-size/iphone-duo)
