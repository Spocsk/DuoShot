---
title: "Captures iPhone Duo dans App Store Connect"
description: "Préparez les captures iPhone Duo (le téléphone pliable d'Apple) et déposez-les manuellement dans App Store Connect. Dépôt DuoShot non testé."
lang: fr
slug: iphone-duo-app-store-connect
alternate: /en/guides/iphone-duo-app-store-connect
updated: 2026-10-16
---

# Captures iPhone Duo (le téléphone pliable d'Apple) dans App Store Connect

Préparez de vraies captures de votre app, exportez des fichiers PNG ou JPEG opaques, puis déposez-les manuellement depuis la fiche de votre app dans App Store Connect. **DuoShot (duoshot.site) n’a pas encore testé le dépôt Duo, y compris via son connecteur automatique expérimental.** La préparation des fichiers ne garantit pas l’approbation d’Apple.

## Quels emplacements utiliser ?

Apple autorise **jusqu’à 10 captures par taille d’appareil** dans App Store Connect. Choisissez l’externe seul, l’interne seul ou un mélange sélectionné. Les dossiers du ZIP indiquent les dimensions. Consultez [toutes les spécifications des captures](/specs).

| Écran | Pixels en portrait | Emplacement App Store Connect | Accès DuoShot |
| --- | --- | --- | --- |
| iPhone Duo — écran externe | 1398 × 2034 | iPhone Duo | Inclus dans l’essai gratuit |
| iPhone Duo — écran interne | 2007 × 2853 | iPhone Duo | Inclus dans l’essai gratuit |
| iPhone 6,3″ | 1206 × 2622 | iPhone Dynamic Island (écran moyen, 6,3″) requis | Inclus dans l’essai gratuit |
| iPhone 6,9″ | 1320 × 2868 | Emplacement iPhone 6,9″ optionnel | Pass, Indie et Studio |

Si les captures 6,9″ optionnelles ne sont pas fournies, App Store Connect utilise des versions mises à l’échelle de captures d’une autre taille : iPhone avec Face ID (grand écran), selon les [spécifications d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

Apple accepte aussi les captures Duo en paysage : **2034 × 1398** pour l’écran externe et **2853 × 2007** pour l’écran interne. Placez les fichiers Duo dans l’emplacement Duo, les captures 6,3″ requises dans leur propre emplacement et les fichiers 6,9″ optionnels dans le leur. L’essai gratuit comprend **2 ZIP HD** après inscription, avec les captures Duo sélectionnées et le format 6,3″ requis.

## Quand les captures Duo seront-elles obligatoires ?

Apple indique que les captures Duo seront **exigées à partir d’avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur**. La condition liée au SDK fait partie de cette exigence. Les [spécifications des captures d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) précisent cette échéance, les deux tailles Duo et leurs variantes paysage, ainsi que les formats PNG/JPEG sans canal alpha ni transparence.

## Avant le dépôt manuel

Partez de vraies captures de l’app et vérifiez chaque composition selon la règle App Store Review 2.3.3 : les captures doivent représenter fidèlement votre app. Gardez les textes et commandes importants à distance du pli sur les captures internes. Le guide de pli de DuoShot est une aide de composition simulée, pas une zone sûre spécifiée par Apple.

Consultez les [dimensions externes](/1398x2034), les [dimensions internes](/2007x2853), le [format 6,3″ requis](/1206x2622) et le [format 6,9″ optionnel](/1320x2868). [Préparez vos captures](/tool), ou lisez le [comparatif des générateurs de captures](/guides/best-app-store-screenshot-generator).

La procédure manuelle ci-dessous suit les [instructions Apple de gestion des visuels App Store](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets). Le dépôt via DuoShot reste non testé.
