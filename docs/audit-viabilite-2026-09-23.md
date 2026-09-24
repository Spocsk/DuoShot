# DuoShot — audit de viabilité produit

**Date : 23 septembre 2026.** Audit du dépôt local et de sources publiques consultées à cette date. Les prix et capacités des concurrents sont leurs propres déclarations ; aucun entretien client, chiffre de ventes ou taux de conversion DuoShot n'est disponible. Ce document distingue faits, constats du code et hypothèses commerciales.

## Décision

**Poursuivre comme expérimentation ciblée, pas lancer l'abonnement sur la promesse actuelle.** Le besoin de préparer des captures pour les deux affichages Duo est plausible et les dimensions sont officielles. La thèse « ZIP accepté du premier coup, zéro rejet » n'est cependant pas démontrable, le dépôt de captures Duo n'est pas encore ouvert dans Connect, et l'export HD actuel peut dépasser la limite de réponse de l'hébergeur. Le produit a donc une base utile, mais pas encore une preuve de viabilité commerciale.

Le calendrier compte : Apple annonce les précommandes le **16 octobre** et la disponibilité le **23 octobre 2026**, dans un mois environ, tandis que sa documentation promet le dépôt des captures Duo **plus tard dans l'année**, sans date ferme. Une page « prêt pour le dépôt Duo aujourd'hui » serait prématurée. [Annonce Apple](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/) · [Spécifications des captures](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

## Ce qui est établi

| Sujet | Fait vérifié | Conséquence pour DuoShot |
| --- | --- | --- |
| Formats Duo | Outer 1398 × 2034, inner 2007 × 2853, et orientations inversées ; 1 à 10 JPEG/PNG, sans transparence. [Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) | Les constantes locales correspondent. L'aplatissement de l'alpha et la vérification des dimensions sont utiles. |
| Disponibilité Connect | Apple indique que le dépôt des assets Duo arrivera plus tard en 2026. [Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) | Aucun test réel d'acceptation Duo ne peut encore justifier la promesse « accepté du premier coup ». |
| Dépôt | Connect décrit le glisser-déposer des **images** dans les emplacements par appareil et langue ; son API crée des ensembles puis des assets individuels. [Interface](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots) · [API](https://developer.apple.com/documentation/appstoreconnectapi/app-screenshots) | Le ZIP est un emballage pratique pour l'utilisateur, pas un format ou une arborescence exigés par Apple. Il faut décompresser puis placer les images, sauf intégration API future. |
| Guideline 2.3.3 | Les captures doivent montrer l'app en usage ; des textes et incrustations sont permis. [Apple](https://developer.apple.com/app-store/review/guidelines/) | Un clone visuel peut signaler une mauvaise représentation, mais Apple ne publie pas de seuil de similarité outer/inner ni de règle « images différentes obligatoires ». Le score du produit doit rester un indice soumis à validation humaine. |
| Nombre de captures | Apple accepte **une** capture au minimum et dix au maximum. [Apple](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots) | L'avertissement « moins de 3 » relève d'un conseil éditorial, pas d'un risque de rejet documenté. |
| Valeur des visuels | Apple permet de tester des variantes de page et de mesurer les conversions, et de créer des pages produit personnalisées. [Optimisation](https://developer.apple.com/app-store/product-page-optimization/) · [Pages personnalisées](https://developer.apple.com/app-store/custom-product-pages/) | La valeur long terme serait l'itération de visuels et de messages, pas uniquement le bon nombre de pixels. |

## Ce qui existe dans le SaaS

Le dépôt fournit un vrai parcours : deux lots d'images, aperçu fermé/ouvert, cadrage, formats de sortie Duo et 6,9 pouces, aplatissement de l'alpha, contrôle de dimensions/couleur, score de similarité, ZIP, compte, quotas, Stripe, et revue client Studio. Les tailles sont dans `src/lib/specs.ts`, le rendu et son assertion finale dans `src/lib/pipeline/process.ts`, et l'export dans `src/app/api/export/route.ts`. Les ensembles de travail sont stockés dans le navigateur (`src/lib/sets-store.ts`) ; les liens de revue et les invitations d'équipe disposent de routes serveur.

Cette base est supérieure à une simple maquette, mais aucune donnée du dépôt ne prouve que des utilisateurs paient ou que des exports ont été acceptés par Apple. Le site public mentionné dans le README n'était pas accessible via l'outil de consultation web utilisé pour cet audit ; les constats d'interface concernent donc le code local, pas un test de production authentifié.

### Écarts prioritaires entre promesse et réalité

1. **Export fiable — P0.** `POST /api/export` renvoie le ZIP entier dans `NextResponse` après sa composition. Vercel limite à 4,5 Mo le corps d'une **réponse** de fonction aussi bien que celui d'une requête. Un set Duo HD réaliste peut dépasser cette taille ; le code évite la limite pour les uploads, mais pas pour le téléchargement. La sauvegarde du ZIP dans Supabase est déclenchée après la réponse et ses erreurs ne sont pas traitées. Il faut enregistrer l'asset, vérifier la réussite, puis renvoyer une URL signée ou une redirection vers le stockage ; tester avec un vrai lot de dix captures. [Vercel](https://vercel.com/docs/functions/limitations)
2. **Promesses Apple — P0.** Le texte annonce « zéro rejet », « ZIP que Connect accepte », « structure ZIP conforme » et attribue le score de clone à 2.3.3. Apple documente les formats de fichiers et le caractère représentatif des captures, mais ni l'arborescence du ZIP ni un détecteur de clone. Réécrire ces affirmations avant une mise en vente. `src/lib/site.ts` et `src/lib/i18n.ts` concentrent ces formulations.
3. **Vraies captures — P0.** Le rendu sait redimensionner, rogner et placer du texte ; il ne peut pas établir que la source montre réellement la version compacte ou dépliée de l'app. Un dHash 64 bits ne le prouve pas non plus. L'interface doit demander une capture native par affichage, afficher sa provenance et un contrôle humain explicite. Les tailles exactes ne garantissent pas l'exactitude du contenu.
4. **Disponibilité et statut — P0.** Séparer « fichiers préparés selon les dimensions publiées » de « dépôt actuellement possible » ; mettre la date de vérification et l'état Connect sur la page de spécifications. Tester le workflow de dépôt dès qu'Apple l'ouvre. [Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
5. **Rétention et confiance — P1.** Une fonction SQL de purge 24 h / 7 jours figure dans les migrations, mais aucune planification de son exécution n'apparaît dans le dépôt. Vérifier la tâche côté Supabase avant d'affirmer une suppression sous 24 h. Les fichiers de travail sauvegardés dans IndexedDB restent, eux, sur l'appareil jusqu'à suppression du set ; l'interface doit distinguer clairement stockage local et serveur.
6. **Cohérence commerciale — P1.** Le plan Studio affiche « 3 sièges bientôt », alors que des routes d'invitation et l'interface de gestion existent. Vérifier un parcours réel de bout en bout, puis annoncer exactement ce qui marche. Les offres et limites divergent encore entre `PRODUCT.md`, le README et le code ; choisir une grille unique. La promesse « illimité » coexiste avec une limite de 100 sets par jour.

## Marché et positionnement

**Indie.** Le travail est réel au lancement ou lors d'une refonte, mais intermittent. À 12 €/mois, l'utilisateur qui publie quelques fois par an a une raison de résilier après le premier export. De plus, le simple export aux bonnes dimensions est déjà offert ou peu coûteux : [AppScreens](https://appscreens.com/pricing) propose cinq captures gratuites et un plan Pro annoncé à 99 $/an ; [AppScreenStudio](https://www.appscreenstudio.com/en/pricing) annonce un premier listing gratuit en pleine résolution ; [App Asset Kit](https://www.appassetkit.com/screenshots/iphone-duo) propose déjà un outil dédié Duo. Le prix de DuoShot ne se défendrait que par un gain de temps et une fiabilité mesurés sur le flux complet. Un paiement par projet ou par export est une hypothèse plus naturelle qu'un abonnement indie seul, à tester avec de vrais acheteurs.

**Studio/agence.** Le travail revient avec plusieurs apps, clients, langues et campagnes. La revue client est une bonne amorce, mais [AppScreens Scale](https://appscreens.com/pricing) annonce 180 $/an pour le travail client, des langues, des projets illimités et un envoi vers les stores ; [Screenshots.pro](https://screenshots.pro/) annonce aussi localisation et API. DuoShot à 49 €/mois doit apporter un bénéfice plus précis : preuve de validation, versions et commentaires par capture, traçabilité des changements, export fiable et préparation par langue/campagne. Un lien de revue de sept jours seul semble insuffisant à ce prix.

**Duo comme niche d'entrée.** Il fournit un problème précis et un angle de recherche clair, mais la fenêtre d'exclusivité est faible : App Asset Kit et [SnapMonk](https://snapmonk.com/blog/iphone-duo-app-store-screenshots) traitent déjà Duo. La pérennité dépendra du nombre d'équipes ayant besoin d'un flux répétable et d'une spécialisation de contrôle qualité que les grands éditeurs ne couvrent pas. Aucun volume de marché ou taux de conversion crédible n'est déductible des sources publiques consultées.

### Proposition de valeur à tester

> « Prépare et révise des captures fidèles de ton app sur les deux écrans de l'iPhone Duo ; vérifie les formats publiés par Apple et partage un set clair avant le dépôt dans App Store Connect. »

Elle décrit les capacités vérifiables. Ne promettre la compatibilité du dépôt que lorsqu'un essai réel dans Connect l'a confirmée. Garder le contrôle de similarité comme alerte, sans parler de rejet automatique.

## Ce qui manque pour une offre convaincante

| Priorité | Fonction ou preuve | Pourquoi |
| --- | --- | --- |
| P0 | Export de gros ZIP par URL signée, test sur fichiers réels et mesure de taux de réussite | Le résultat acheté doit parvenir à l'utilisateur. |
| P0 | Source outer/inner attestée, aperçu des pixels réellement exportés, checklist de vérité visuelle | La conformité technique ne suffit pas à satisfaire 2.3.3. |
| P0 | Copy fidèle à la documentation Apple, statut Connect à jour | Éviter de vendre une garantie impossible. |
| P1 | Projets persistants et synchronisés entre appareils pour les studios ; versions/reviews liées au même set | Le navigateur seul est fragile pour une équipe ou un client. |
| P1 | Variantes par langue, ordre et texte éditables ; exports par locale | Une seule langue et un seul set limitent le travail récurrent. |
| P1 | Vrai parcours Studio : invitations, approbation, changements, réexport, droits | C'est la justification la plus plausible du prix Studio. |
| P2 | Variantes PPO/CPP, liaison éventuelle à Connect lorsque Duo sera supporté | Favorise les itérations, sans concurrencer tout de suite les suites complètes. |

## Repartir de zéro sur le design : cadrage

Oui pour **reconcevoir l'expérience**, pas pour jeter le moteur d'export et les contrôles utiles. Le design actuel donne beaucoup de place au vocabulaire de rejet, aux paramètres techniques et à un aperçu de coque. Le parcours prioritaire devrait se lire en quatre étapes : **choisir l'app et le set → importer les vraies captures fermé/ouvert → inspecter chaque paire et corriger les risques → exporter et, pour Studio, faire valider**. Les pixels et la conformité doivent rester visibles au moment où l'on décide, mais l'utilisateur doit d'abord voir son histoire de captures et ce qui sera effectivement envoyé à Apple. Un écran de résultat doit indiquer exactement ce qui est prêt, ce qui reste à vérifier et comment charger les images dans Connect.

Avant de dessiner la nouvelle interface, tester deux propositions séparées : « préparer mes captures Duo sans erreur technique » avec des indies et « approuver et livrer des sets multi-apps » avec des studios. Leurs besoins peuvent conduire à deux parcours et deux modèles de prix plutôt qu'à un unique éditeur chargé de tout faire.

## Plan de validation, avec décisions explicites

1. **Cette semaine :** corriger l'export et les affirmations erronées ; faire passer un lot de 10 vraies captures Duo, puis vérifier taille, absence d'alpha, téléchargement et contenu extrait du ZIP. Vérifier la purge réelle dans Supabase.
2. **Avant les précommandes du 16 octobre :** mener 12 à 15 entretiens avec développeurs iOS ayant testé leur app sur Duo et 5 à 8 avec studios. Demander leurs fichiers, leur flux existant, le temps perdu et un exemple de set qu'ils voudraient traiter ; observer l'usage plutôt que demander « paieriez-vous ? ».
3. **Test de vente :** proposer un service manuel assisté par DuoShot à des personnes qui ont un lancement réel. Mesurer le nombre de sets achevés, le temps gagné, les retours/corrections, les achats réellement payés et les demandes de retour après un mois. Tester un prix par projet pour indie et un abonnement Studio uniquement si les projets se répètent.
4. **Après ouverture de l'upload Duo dans Connect :** déposer des sorties issues de cas réels, consigner tout refus avec son motif exact, puis seulement ajuster la promesse et automatiser davantage. Mesurer l'acceptation des fichiers séparément de l'approbation de l'app.

**Critère de poursuite proposé, à ajuster après les premiers entretiens :** au moins cinq utilisateurs externes terminent un set sans aide, trois achètent la prestation ou un accès payant, et deux studios reviennent avec un second projet. Sans ces signaux, limiter l'investissement à un utilitaire Duo gratuit ou à faible prix, et ne pas construire une suite SaaS complète par anticipation. Ces seuils sont des règles de décision proposées, pas des données de marché.
