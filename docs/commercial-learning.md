# Apprentissage commercial et suivi GEO

Statut : protocole prêt ; recrutement, publications et envois non réalisés. Jour 0 = date du lancement technique validé, à renseigner après déploiement. Ne pas dater artificiellement le début de l’expérience au jour de création de ces documents.

## Promesse et démonstration

DuoShot — App Store Screenshot QA prépare et vérifie les fichiers de captures fermé/ouvert. Livrable : deux séries aux dimensions attendues dans un ZIP à décompresser, puis dépôt manuel quand App Store Connect ouvre les emplacements Duo. Les contrôles ne garantissent pas l’approbation Apple. Harbor est une app fictive de démonstration.

Démonstration de trois minutes : importer une paire, montrer les pixels exportés, corriger un cadrage, distinguer contrôles techniques et confirmation humaine, télécharger/décompresser, montrer les fichiers. Variante Studio : créer une revue, obtenir une décision, révoquer le lien. Dire explicitement que les projets restent sur l’appareil et ne sont pas synchronisés.

## Cinq observations individuelles et trois Studio

Recruter cinq développeurs externes et trois studios qui préparent réellement des captures. Ne pas compter le fondateur ou les comptes de recette. Session de 30 minutes ; demander l’accord avant tout enregistrement. Ne collecter ni captures confidentielles ni identifiants clients dans les notes.

Consigne individuelle : « Prépare les fichiers fermé/ouvert de ton app à partir de ces sources, puis retrouve ton ZIP. » Laisser la personne agir sans tutoriel ; noter ses attentes avant chaque étape, erreurs, hésitations, assistance nécessaire, temps de l’import au premier export et compréhension du résultat. Après usage, demander le dernier problème similaire, sa fréquence et la solution actuelle, puis présenter les tarifs.

Consigne Studio : un propriétaire invite deux collaborateurs, un membre crée une revue, un interlocuteur joue le client, puis le propriétaire révoque l’accès. Observer la compréhension des trois sièges et des brouillons locaux. Recontacter après un vrai second projet ; une intention déclarée ne compte pas comme réutilisation.

Registre minimal : code participant, segment, date, tâche réussie seul/assisté/échouée, temps, blocages observés, achat enregistré oui/non, second projet enregistré oui/non. Séparer propos rapportés et observations.

Seuils de décision, sans valeur de prévision : cinq utilisateurs externes autonomes, trois achats enregistrés, deux studios revenus avec un second projet. Si non atteints, examiner d’abord recrutement et blocages ; ne pas déduire une absence de marché de quelques visites.

## Tester l’achat par projet sans développer une nouvelle facturation

Après la tâche, comparer verbalement l’abonnement Indie actuel à une option par projet présentée comme une hypothèse. Demander ce que la personne achèterait pour son prochain besoin concret, à quel moment, et ce qui justifierait de payer. Ne pas afficher un faux bouton de paiement ni compter une intention comme une vente. Fixer le prix hypothétique et le périmètre d’un « projet » avec le propriétaire avant une offre commerciale publique ; ne pas changer les quatre offres actuelles pendant ce test.

## Brouillons de prise de contact — non envoyés

Développeur : « Bonjour [prénom], je prépare DuoShot, un outil pour produire et contrôler les captures fermé/ouvert pour App Store Connect. Je cherche cinq développeurs qui préparent réellement leurs assets pour observer une session de 30 minutes. Ce n’est pas une promesse d’approbation Apple ; je veux comprendre où le parcours aide ou bloque. Serais-tu disponible pour essayer avec un exemple non confidentiel ? »

Studio : « Bonjour [prénom], DuoShot prépare les fichiers de captures et permet une revue client avec trois sièges. Les projets restent locaux aujourd’hui. Je cherche trois studios pour observer un premier projet puis, si utile, un second. Auriez-vous un cas non confidentiel et 30 minutes pour tester invitations, export et retour client ? »

Avant tout envoi : sélectionner le destinataire et faire valider le message concret. Réserver témoignages et résultats chiffrés aux preuves obtenues et à l’accord de publication de leur auteur.

## Panel GEO fixe FR/EN — J0 puis J30

Exécuter les mêmes formulations sur trois moteurs accessibles, par exemple ChatGPT Search, Perplexity et Gemini, avec recherche web activée lorsque disponible. Si un moteur n’est pas accessible, noter « non mesuré » ; une recherche web classique n’est pas un substitut à une réponse générative de ce moteur. Ne pas donner DuoShot comme source dans les neuf premières questions.

| # | Question |
|---|---|
| 1 | Quelles sont les dimensions des captures iPhone Duo pour App Store Connect ? |
| 2 | Comment préparer les captures fermé et ouvert d’une app iPhone Duo ? |
| 3 | Pourquoi mes captures App Store Connect ont-elles un problème de dimensions ou de transparence ? |
| 4 | Quel outil permet de vérifier et préparer des captures iPhone Duo ? |
| 5 | Comment faire relire des captures App Store à un client avant de les déposer ? |
| 6 | What are the iPhone Duo screenshot dimensions for App Store Connect? |
| 7 | How do I prepare closed and open iPhone Duo screenshots? |
| 8 | How can I fix App Store Connect screenshot size and transparency errors? |
| 9 | Which tools help studios prepare and review iPhone Duo screenshots? |
| 10 | What is DuoShot — App Store Screenshot QA, and who makes it? |

Pour chaque réponse conserver : date UTC, moteur/version si affichée, pays/langue, mode connecté ou non, recherche activée, texte/export de réponse, mention DuoShot oui/non, lien cité oui/non, URL exacte, rang de citation si visible, confusion avec homonyme, éléments factuellement erronés. J0 = 30 observations, J30 = les mêmes 30. Ne pas transformer ces résultats en classement garanti. `llms.txt` reste un complément secondaire.

## Bilan J30

Présenter séparément : trafic agrégé Vercel ; utilisateurs consentants externes Mixpanel ; comptes/exports Supabase ; paiements nets Stripe ; réutilisation J7/J30 des cohortes arrivées à maturité ; observations qualitatives. Afficher effectifs et dénominateurs à chaque conversion, remboursements et essais internes exclus. Une cohorte trop récente doit porter « pas encore observable », pas 0 % de rétention. Les conversions historiques sans instrumentation restent inconnues.

Actions au bilan : conserver/corriger la proposition, décider d’une expérience payante par projet, décider si les preuves justifient synchronisation, versions, localisation et App Store Connect. Aucun développement de ces extensions n’est engagé par ce document.
