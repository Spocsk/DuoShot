# Production et migration VPS — état au 26 septembre 2026

## Décisions et blocages

- Décision utilisateur actualisée : **nouveau CX23 exclusivement pour DuoShot**, plutôt que rescale du VPS existant. Conserver Coolify sur l'ancien VPS et lui rattacher le nouveau serveur.
- Dépense autorisée explicitement à **7,19 € TTC/mois**, sans sauvegardes Hetzner payantes. Serveur créé : `duoshot-prod`, ID Hetzner `167542515`, IPv4 `178.104.185.75`, Falkenstein, CX23 / 2 vCPU / 4 Go / 40 Go. Ubuntu 24.04, IPv6 et pare-feu existant appliqué. Accès SSH par la clé du Mac vérifié.
- Démarrage avec `RENDER_CONCURRENCY=1`, images construites hors du VPS. Une montée en gamme future reste soumise aux stocks ; ne pas promettre un upgrade immédiat.
- La stack Supabase complète documente 4 Go / 2 CPU / 40 Go comme minimum pour elle seule, et recommande 8 Go ou plus. Valider une stack réduite aux services utilisés et sa marge mémoire avec DuoShot avant migration ; conserver Supabase Cloud pendant la préparation. Les objectifs de charge restent à vérifier, pas garantis sur CX23.
- Réutiliser Coolify et son proxy ; préserver tous les projets existants.
- Aucune migration de données ni bascule DNS exécutée. Les alternatives ci-dessous sont conservées pour référence ; le CPX42 n'est pas retenu.
- Rattachement Coolify effectué et validation terminée. La clé administrateur existante est autorisée uniquement depuis l’IP de l’ancien VPS. Serveur Coolify `tm1ijjnpf2jnm68prtkezgav`. Projet `DuoShot` créé (`a31oimznlhul8pxbpfbtjerr`).
- Les disponibilités de nouveaux CX43 à Falkenstein/Helsinki ne sont PAS confirmées. L'affichage d'une ligne tarifaire ne prouve pas sa disponibilité.

## Alternatives budgétaires

Tarifs consultés le 26 septembre, avec TVA française à 20 %. Vérifier le panier avant tout achat.

| Option | Prix affiché | Limite / conséquence |
| --- | --- | --- |
| Hetzner CX43, 8 vCPU / 16 Go / 160 Go | 19,19 €/mois serveur, +0,60 € IPv4 | Nouveau serveur dans une autre région si disponible ; sauvegardes en supplément. |
| Hetzner CX33, 4 vCPU / 8 Go / 80 Go | 10,19 €/mois serveur, +0,60 € IPv4 | Candidat pour une migration progressive ; capacité complète DuoShot + Supabase à mesurer. |
| Hetzner CAX31, ARM, 16 Go | 25,19 €/mois serveur | Pas de rescale depuis x86 ; compatibilité de toutes les images à vérifier. |
| OVH VPS-3, 6 vCores / 12 Go / 100 Go | À partir de 12,48 € TTC/mois | Lien commercial configuré avec `pricing=upfront12` ; tarif mensuel sans engagement et disponibilité non validés. |
| OVH VPS-4, 8 vCores / 24 Go / 200 Go | À partir de 23,95 € TTC/mois | Même réserve sur les conditions tarifaires ; candidat pour regrouper les projets après tests. |

Un second serveur s'ajoute à la facture actuelle. Un remplacement nécessite la migration vérifiée de tous les services avant toute résiliation. Les vCPU ne constituent pas une garantie de débit de rendu ; les tests de charge restent obligatoires.

Sources :
- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://docs.hetzner.com/cloud/servers/faq/
- https://www.ovhcloud.com/fr/vps/
- https://coolify.io/docs/core/infrastructure/servers/overview

## Nouveau VPS dédié — préparation effectuée

- Démarrage et accès SSH validés. Aucun service système en échec ni zombie observé lors du premier contrôle.
- Mises à jour Ubuntu installées ; redémarrage et reconnexion SSH vérifiés. Noyau actif `6.8.0-142-generic`, aucun service en échec, pas de redémarrage supplémentaire requis.
- Docker Engine 29.8.1 et Compose 5.5.1 installés via le dépôt officiel Docker.
- Swap de secours 2 Gio, swappiness 10 ; elle ne remplace pas la RAM nécessaire aux rendus.
- Logs Docker limités par défaut avec le pilote `local` : 10 Mo × 3 fichiers par conteneur.
- Test `docker run --rm hello-world` réussi après redémarrage ; environ 3,3 Gio de RAM disponibles, swap inutilisée au repos.
- Proxy et Sentinel Coolify sains. Supabase officiel `self-hosted/v0.8.2` installé dans `/data/duoshot/supabase` : PostgreSQL, Auth, PostgREST, Storage et Envoy. Les cinq services sont sains avant leur reprise par Coolify. API limitée à `127.0.0.1:8000`, PostgreSQL sans port public ; inscriptions désactivées.
- Test réel réussi : upload privé de 60 Mio, URL signée, téléchargement vérifié par SHA-256, accès anonymes refusés, suppression des seuls objets synthétiques. Environ 270 Mio pour Supabase au repos et 2,9 Gio disponibles sur le VPS ; aucun test de rendu en charge à ce stade.
- Ressource Coolify `duoshot-supabase` créée (`5if8qfnj7o1bi2lrd3nbncff`), reprise des mêmes données et clés en cours. Les secrets restent dans des fichiers root-only sur le nouveau VPS.
- Migration des comptes en attente de la connexion PostgreSQL source. Fichier privé demandé sur le Mac : `~/.config/duoshot/source-database-url`. Ne pas le committer. SMTP et OAuth restent à configurer.

## Audit de l'ancien VPS hébergeant Coolify

- Ubuntu 24.04.4, noyau 6.8.0-110-generic, redémarrage requis.
- Environ 3,7 Gio RAM, 2,5 Gio utilisés ; swap 1,9/2 Gio, sans échange actif observé pendant la mesure.
- Racine : environ 9,7 Go libres ; volume supplémentaire de 15 Go presque vide.
- 22 conteneurs en fonctionnement : Coolify, Traefik, Postiz, n8n, Umami, applications et bases associées.
- Trois processus Node zombies observés ; ne pas tuer arbitrairement leurs parents.
- `cloud-init-hotplugd` en échec : exception de détection des métadonnées dans son journal. Cause et remédiation encore à vérifier.
- Index APT rafraîchis avec succès. Aucune mise à niveau des paquets, suppression Docker ou opération de redémarrage exécutée.
- Sauvegarde cohérente et restauration à vérifier avant maintenance. Le simple inventaire du dossier Coolify ne prouve pas l'existence d'une sauvegarde exploitable.

## Corrections locales préparées, non déployées

- Dockerfile Node 24 / Next standalone, utilisateur non privilégié et endpoint de santé.
- Workflow `.github/workflows/container.yml` préparé (manuel ou push de la branche de migration) pour construire l'image Linux amd64 dans GitHub Actions et la publier sur GHCR avec le SHA du commit. Variables publiques de build configurées dans GitHub, dont `https://api.duoshot.site` pour la future API ; aucun secret serveur dans les arguments de build. Export Docker temporaire conservé un jour pour transférer l’image sans clé de registre persistante sur le VPS. Construction CI à vérifier.
- Suppression du fallback Supabase Cloud codé en dur et de Vercel Web Analytics.
- Layouts racines FR/EN distincts pour corriger la langue HTML sans rendre les pages publiques dynamiques.
- Validation stricte des rendus, chemins possédés par l'utilisateur, couleurs, dimensions et tailles ; sources dédupliquées et vérifiées avant traitement.
- Limites : 50 Mio/source, 200 Mio/lot, 40 mégapixels/image, 100 Mio/ZIP.
- Réduction des copies mémoire et de la concurrence des rendus ; attente de la fin des travaux en cours avant nettoyage sur erreur.
- Garde provisoire d'un rendu actif par processus Node sur CX23, configurable à deux après mesures. **Ce n'est pas la file PostgreSQL durable prévue**, ni une limite globale entre plusieurs réplicas.
- Meilleure détection des erreurs d'envoi Mixpanel ; scripts de contrôle des variables et de maintenance.
- Vitest mis à jour ; audit npm sans vulnérabilité lors du contrôle.

Validation : 190 tests unitaires réussis, lint et `git diff --check` réussis. Build final réussi après ajout du contrôle de concurrence et passage à un rendu par défaut ; les 3 tests de contrôle de concurrence repassent. Les 35 tests Cypress ciblés ont réussi avant cet ajout. Image Docker non construite (Docker local indisponible). Aucun test de charge réel de production effectué.

## Travail restant avant ouverture

1. Rattachement du CX23 à Coolify terminé ; vérifier le déploiement de la ressource Supabase et les sauvegardes/restaurations avant migration et maintenance.
2. Préparer l'image Linux dans CI, configurer Coolify, les limites mémoire et les sauvegardes externes chiffrées.
3. Implémenter la file durable PostgreSQL et le worker : admission, un travail global au démarrage sur CX23 (deux après mesures), reprise, leases, idempotence, remboursement unique, statut récupérable côté client.
4. Migrer Supabase avec utilisateurs/Auth/UUID/données et fichiers Storage séparément ; vérifier les politiques privées et les liens de review.
5. Vérifier Stripe **live** : seul le compte de test est accessible via le connecteur ; la production précédemment inspectée n'avait pas de webhook configuré. Ne pas déclarer les paiements opérationnels.
6. Vérifier les événements métier Mixpanel réels et créer les rapports. Actuellement seuls l'événement d'instrumentation et les événements de session sont visibles dans le projet.
7. Vérifier SEO/GEO sur le domaine final : les corrections locales ne corrigent pas le déploiement Vercel actuel tant qu'elles ne sont pas publiées.
8. Tester uploads, ZIP complets, reviews et abonnements ; charge progressive jusqu'à 30 utilisateurs puis pic de 50, mesure mémoire/latence/erreurs et absence de perte.
9. Maintenance et synchronisation finale, bascule DNS, contrôles de production et procédure de retour arrière compatible avec les nouvelles écritures.

Le domaine reste chez Vercel ; sa gestion DNS sera modifiée uniquement à la bascule validée. Ne pas résilier les services existants avant validation des remplacements.
