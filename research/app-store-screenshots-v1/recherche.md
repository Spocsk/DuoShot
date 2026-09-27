# Recherche V1 — Présentation App Store

26 septembre 2026. Premier échantillon exploratoire, pas un classement de conversion. Aucune performance A/B disponible. Les visuels App Store ont été récupérés depuis l’API publique Apple, storefront US ; cette API peut renvoyer des formats anciens. Ne pas assimiler ces images à toutes les variantes actuelles des fiches.

## Sources et portée

- Appllama : deux recherches de catalogue, puis le parcours Photo Editing de Photomator (10 écrans référencés dans `appllama-photomator.json`). La bibliothèque décrit ici l’interface réelle, pas les créations promotionnelles App Store. Les 10 images ont été téléchargées puis inspectées dans l’ordre du parcours.
- Photomator : https://apps.apple.com/us/app/id1444636541 — 10 visuels de présentation inspectés, planche `board-1.jpg`.
- Lightroom : https://apps.apple.com/us/app/id878783582 — 10 visuels inspectés, planche `board-2.jpg`.
- Headspace : https://apps.apple.com/us/app/id493145008 — 8 visuels inspectés, planche `board-3.jpg`.
- Captures Appllama consultables dans `images/`, planche de travail `board-4.jpg`. Watermark Appllama = provenance, à ne pas reproduire.

## Observations visuelles

| Référence | Ce qui est visible | Principe à retenir | Limite |
|---|---|---|---|
| Photomator | Fond clair uniforme, titre noir bref, appareil de face, interface sombre et photographie colorée ; un visuel multiappareil rompt la répétition | La cohérence de grille laisse les fonctionnalités et les photos différencier les visuels | Modèle d’iPhone ancien dans ce jeu ; petites commandes difficiles à lire en miniature |
| Lightroom | Gros titres noirs sur bande blanche, photographie occupant presque toute la largeur, outils en partie basse, comparaisons et masques de retouche | Montrer le résultat et le mécanisme qui le produit, avec un bénéfice par image | Les récompenses et affirmations appartiennent à la marque ; ne jamais les reprendre sans preuve |
| Headspace | Palette jaune/orange, variante violette pour le sommeil, cartes d’interface agrandies au premier plan, titres orientés bénéfices | Couleur liée à l’usage et grossissement d’un élément significatif | Présence d’éléments Android dans le jeu récupéré, et panneaux purement marque/presse ; référence graphique seulement, pas modèle de conformité iOS |

Dans les 10 images Appllama Photomator inspectées, les états outil/crop/ajustements rendent la fonction concrète. Choisir un état où l’action ou le résultat est visible est plus informatif qu’une page d’accueil vide ou un simple logo. Ce constat soutient le choix de vraies captures comme matière première.

## Conséquences pour le futur skill

1. Deux recherches complémentaires : UI réelle et galerie promotionnelle.
2. Storyboard lié aux fonctionnalités existantes, avec traçabilité de chaque capture.
3. Plusieurs familles de compositions ; aucun cadre de téléphone imposé.
4. Rendu reproductible et édition indépendante des textes, captures, décors et formats.
5. Validation technique automatique puis inspection visuelle.
6. Vérification des exigences Apple au moment de produire, pour éviter un tableau de dimensions figé.

## Références Apple

- Dimensions, formats et groupes requis : https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Fidélité et contenu : https://developer.apple.com/app-store/review/guidelines/#accurate-metadata
- Priorité des premiers visuels et usage des captures : https://developer.apple.com/app-store/product-page/

Exemple technique vérifié à cette date : 1320 × 2868 est une taille portrait acceptée pour la classe iPhone 6,9 pouces. Pour iPad, la classe 13 pouces accepte notamment 2064 × 2752. Le choix final dépend des appareils supportés et des emplacements disponibles dans App Store Connect.

## À raffiner ensemble

- Équilibre entre photographie, interface et illustration.
- Directions graphiques souhaitées et contre-exemples.
- Degré de variation entre images d’une même série.
- Choix du moteur de composition et du format des sources éditables.
- Premier cas réel pour tester le prompt avant de le transformer en skill.

Les références téléchargées sont conservées pour étude ; elles ne constituent pas des ressources réutilisables dans les livrables marketing.
