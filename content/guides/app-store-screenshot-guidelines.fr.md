---
title: "Règles des captures App Store"
description: "Les règles App Review des captures (2.3.3, 2.3.7–2.3.10) et les règles de fichier Apple : 10 max par taille, JPEG ou PNG, sans transparence."
lang: fr
slug: app-store-screenshot-guidelines
alternate: /guides/app-store-screenshot-guidelines
updated: 2026-11-04
published: 2026-11-04
---

# Règles des captures App Store : pourquoi elles sont refusées

Les captures sont des métadonnées : l’App Review les contrôle donc avec les mêmes règles que le nom et la description de votre app. La plupart des refus viennent de cinq lignes des règles de validation de l’App Store (section 2.3, « Métadonnées exactes ») et d’une règle de fichier d’App Store Connect. Les voici, citées d’après Apple, avec ce que chacune veut dire en pratique.

## Les règles de fichier (App Store Connect)

D’après les [spécifications de captures d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) :

- Vous devez inclure **au moins une capture** et pouvez en déposer **jusqu’à 10 par taille d’appareil**.
- Formats : **.jpeg, .jpg ou .png**.
- **« Les images ne peuvent pas contenir de canal alpha ni de transparence. »** Un PNG exporté avec transparence est refusé au dépôt. Aplatissez-le sur un fond opaque.
- Tailles requises : au moins une capture pour l’**iPhone avec Dynamic Island (écran moyen)**, et pour l’**iPad 13 pouces** si votre app prend en charge iPadOS. Voir notre [guide des tailles de captures App Store](/guides/app-store-screenshot-sizes) pour chaque taille en pixels.
- Si votre interface est identique sur toutes les tailles et toutes les langues, vous n’avez besoin que de la plus haute résolution requise ; App Store Connect la réduit.
- **iPhone Duo** : 1398 × 2034 (écran externe) et 2007 × 2853 (écran interne), en portrait ou en paysage. Apple indique qu’elles seront requises à partir d’avril 2027 pour toute app utilisant le SDK iOS 27.1 ou ultérieur. Détails dans notre [guide des tailles iPhone Duo](/guides/screenshot-size/iphone-duo).

## Les règles de validation qui s’appliquent aux captures

### 2.3.3 : montrer l’app en usage

« Les captures doivent montrer l’app en usage, et pas seulement l’illustration-titre, la page de connexion ou l’écran de démarrage. »

C’est le refus de capture le plus fréquent. Un ensemble composé uniquement d’un logo, d’un slogan marketing sur un dégradé ou de l’écran de connexion échoue. Apple autorise explicitement les **superpositions de texte et d’image** : les légendes et les arrière-plans sont donc acceptés, tant que l’interface réelle est visible sur chaque image.

**Correctif :** placez un véritable écran de votre app dans chaque image. Gardez des légendes courtes, par-dessus ou autour de l’interface, pas à sa place.

### 2.3.7 : pas de prix ni de termes hors sujet

« Les métadonnées comme les noms d’apps, les sous-titres, les captures et les aperçus ne doivent pas inclure de prix, de conditions ou de descriptions qui ne sont pas propres au type de métadonnée. »

La même règle interdit de bourrer les métadonnées de « termes déposés, noms d’apps populaires, informations tarifaires ou autres formules hors sujet dans le seul but de tromper le système ».

**Correctif :** retirez « Gratuit », « -50 % », « 4,99 € » et les noms de concurrents de vos légendes. Décrivez ce que fait l’écran.

### 2.3.8 : adapté aux 4+, même si votre app ne l’est pas

« assurez-vous que les icônes, captures et aperçus de votre app et de vos achats intégrés respectent une classification 4+, même si votre app est classée plus haut. »

Exemple d’Apple : un jeu violent doit choisir des images qui « ne montrent pas une mort atroce ni une arme pointée sur un personnage précis ». Les mentions « For Kids » et « For Children » sont réservées à la catégorie Enfants.

### 2.3.9 : droits et fausses données

« Vous êtes responsable de l’obtention des droits d’utilisation de tous les éléments de vos icônes, captures et aperçus, et vous devez afficher des informations de compte fictives plutôt que les données d’une personne réelle. »

**Correctif :** utilisez des comptes de démonstration avec des noms, e-mails et photos inventés dont vous avez les droits. Aucune donnée client réelle, aucune œuvre sous droits que vous n’avez pas licenciée.

### 2.3.10 : pas d’autres plateformes

« n’incluez pas de noms, d’icônes ou d’images d’autres plateformes mobiles ou de magasins d’applications alternatifs dans votre app ou vos métadonnées, sauf en cas de fonctionnalité interactive spécifique et approuvée. »

**Correctif :** n’affichez pas de téléphone Android, de badge Play Store ni de mention « Aussi sur Android » dans vos captures App Store. Utilisez des cadres d’appareils Apple, ou pas de cadre du tout.

### 2.3.1 : ne pas promettre ce que l’app ne fait pas

La règle 2.3.1(a) prévient que « commercialiser votre app de façon trompeuse, par exemple en mettant en avant des contenus ou services qu’elle n’offre pas réellement … ou en annonçant un faux prix » peut entraîner un retrait. Une capture d’une fonctionnalité absente de la version soumise entre dans ce cas.

## Liste de vérification avant soumission

- Chaque capture montre un véritable écran de l’app (2.3.3).
- Aucun prix, remise ni nom de concurrent dans les légendes (2.3.7).
- Les images conviennent à un public 4+ (2.3.8).
- Données de démonstration uniquement, tous les éléments licenciés (2.3.9).
- Aucun appareil Android ni badge d’un autre magasin (2.3.10).
- Chaque fonctionnalité montrée existe dans la version soumise (2.3.1).
- Les fichiers sont en JPEG ou PNG, opaques, à une taille en pixels acceptée, 10 au maximum par taille.
- Vous avez la taille iPhone requise (et l’iPad 13 pouces si vous prenez en charge l’iPad).

## La place de DuoShot

[DuoShot](/) exporte des fichiers PNG ou JPEG opaques aux tailles exactes d’Apple, dont les écrans externe et interne de l’iPhone Duo et la taille iPhone requise, pour que les contrôles de fichier passent au dépôt. Les règles de validation ci-dessus portent sur le contenu : DuoShot ne peut pas en décider à votre place, lancez donc la liste de vérification avant de soumettre. Vous pouvez l’essayer gratuitement avec 2 exports HD, sans carte.

Règles citées d’après les règles de validation de l’App Store d’Apple (dernière mise à jour le 16 octobre 2026) et les spécifications de captures d’App Store Connect, vérifiées le 4 novembre 2026.
