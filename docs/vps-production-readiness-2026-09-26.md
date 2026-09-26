# Production et migration VPS — état au 26 septembre 2026

## Décision et état réel

Nouveau **CX23 dédié à DuoShot**, autorisé à **7,19 € TTC/mois** (serveur + IPv4), sans sauvegardes Hetzner payantes. Le VPS existant conserve Coolify et ses autres projets.

- Hetzner : `duoshot-prod`, ID `167542515`, Falkenstein, IPv4 `178.104.185.75`, 2 vCPU partagés, 4 Go RAM, 40 Go disque.
- Coolify : serveur `tm1ijjnpf2jnm68prtkezgav`, projet `a31oimznlhul8pxbpfbtjerr`, environnement production `x1jgceugvx4nelbottfuxk8f`.
- Site et Supabase **déployés en accès privé**. Aucun compte ou fichier de l'ancienne production importé ; aucune bascule DNS ni résiliation.
- Le domaine reste enregistré chez Vercel. Les enregistrements DNS seront modifiés à la bascule validée ; un transfert de registrar n'est pas requis pour héberger ailleurs.
- Un upgrade futur dépend des disponibilités. Le CX23 n'est pas une garantie de débit ; la capacité doit être mesurée avec les rendus réels.

## Nouveau serveur et services

Ubuntu 24.04 mis à jour, redémarrage effectué, noyau `6.8.0-142-generic`. Docker 29.8.1 et Compose 5.5.1 depuis le dépôt officiel. Swap de secours 2 Gio, swappiness 10 ; logs Docker `local` limités à 10 Mo × 3.

SSH par clés uniquement, nouvelle connexion vérifiée. Clé d'administration Coolify limitée à l'IP de l'ancien VPS. Le hook cloud-init traitait certains veth Docker comme de vraies interfaces réseau ; garde ajoutée pour les interfaces virtuelles. Aucun zombie observé sur le nouveau VPS.

| Ressource | Configuration active |
| --- | --- |
| `duoshot-supabase`, `5if8qfnj7o1bi2lrd3nbncff` | PostgreSQL, Auth, PostgREST, Storage et Envoy ; cinq services sains ; API sur 127.0.0.1:8000 uniquement, aucun port PostgreSQL public. |
| `duoshot-web`, `i9qtpe5bpyig86s1aljxr5gv` | Next standalone, Node 24 non privilégié ; 127.0.0.1:3000 uniquement ; 1 536 Mio RAM, 256 PID, heap Node 512 Mio, un rendu actif. |
| Maintenance systemd | Storage toutes les 15 minutes ; effacement analytics chaque jour à 04:00 UTC. Deux exécutions manuelles réussies. Une file vide ne valide pas les identifiants Mixpanel GDPR. |

Supabase réduit est basé sur la distribution officielle `self-hosted/v0.8.2`. Données et clés persistent sous `/data/duoshot/supabase`; secrets root-only. Schéma applicatif et retrait des anciennes RPC appliqués sur la cible neuve. Inscriptions publiques désactivées ; SMTP et Google OAuth non configurés. La stack Supabase complète recommande davantage de RAM ; seuls les services nécessaires sont lancés ici.

Contrôle après sauvegarde : huit conteneurs sains, aucun service systemd en échec, zéro zombie, 28 Go libres sur la racine et swap inutilisée. Comptes, workspaces, travaux et objets Storage synthétiques : tous supprimés.

Image applicative validée en charge : `ghcr.io/spocsk/duoshot:3a0570ff57ed111c4dac778d55f02856db51e71b`.

## Corrections et validation

- Limites de sources, lots, pixels et ZIP : 50 Mio/source, 200 Mio/lot, 40 MP/source et intermédiaire, 100 Mio/ZIP. Validation des chemins propriétaires et métadonnées réelles.
- Attente des traitements en cours avant nettoyage sur erreur ; remboursements d'export idempotents.
- Images intermédiaires en mémoire brute : évite deux encodages PNG par rendu. Comparaison exacte des pixels réussie sur 12 combinaisons transparence/EXIF, cadrage et format. Test permanent contre la régression de prémultiplication alpha.
- Fontconfig et polices embarquées dans l'image ; fallback SVG vérifié.
- URL Supabase interne pour les services, identité du cookie public préservée, URL signées réécrites vers l'API publique prévue.
- Envoy : suppression du timeout fixe de 30 secondes pour Storage, délai d'inactivité 120 s et durée maximale 600 s ; query strings et Referer retirés des logs pour ne pas journaliser les tokens signés.
- SEO : langue HTML FR/EN, canonicals/sitemap du domaine final et noindex sur outil, compte et reviews. Voir [audit SEO/GEO](seo-geo-vps-2026-09-26.md). Le domaine public actuel conserve les anciennes erreurs jusqu'à la bascule.
- Retrait de Vercel Web Analytics. Analytics métier soumis au consentement ; erreurs de livraison Mixpanel détectées.

212 tests unitaires, TypeScript et lint réussis. CI applicative `36264877740` et image `36264875329` réussies pour `3a0570f`, avec 65 tests Cypress dont la récupération après rechargement sans nouvelle soumission. Le contrôle Vercel de la PR échoue sur les limites de cron Hobby ; il ne représente pas le déploiement VPS.

## Tests réels sur la cible privée

1. Upload privé de 60 Mio, URL signée, téléchargement SHA-256 identique, accès anonyme refusé, objets synthétiques supprimés.
2. Trente téléchargements simultanés à froid de l'exemple : 30/30 réussis, ZIP CRC valide, 5,6–5,8 s. Ce test mesure le cache partagé de l'exemple, pas trente rendus personnalisés.
3. Compte gratuit : vingt images HD dans un ZIP de 43 Mo ; archive entièrement téléchargée et CRC vérifié. Récupération du téléchargement sans consommer un essai supplémentaire.
4. Isolation : téléchargement anonyme 401, autre utilisateur 404, sources d'un autre utilisateur 403. Review publique accessible, révocation réservée au propriétaire, médias devenus 410 après révocation.
5. Mesure avant optimisation (`3376a1e`) : vingt images en 42,6 s ; 5 rendus personnalisés simultanés réussis, P95 28,3 s. À 15 utilisateurs, 9 réussites et 6 rejets `RENDER_BUSY` après expiration de l'attente. Pic mémoire application 598 Mio, aucun OOM/redémarrage, swap inutilisée. Santé HTTP : 80 contrôles sans erreur, P95 95 ms.
6. Après optimisation (`cb14b4b`) : vingt images en 19,0 s (55 % plus rapide). 5/5 utilisateurs, P95 14,4 s ; 15/15, P95 36,1 s ; 30 utilisateurs : 20 réussites et 10 rejets `RENDER_BUSY`. Palier 50 non exécuté après cet échec. Pic mémoire 488 Mio, aucun OOM/redémarrage, 80 sondes de santé sans erreur (P95 79 ms). Les 51 comptes synthétiques et leurs fichiers ont été nettoyés.

Le générateur de charge s'exécute dans un conteneur séparé sur le même VPS, avec authentification réelle, upload, rendu et vérification CRC. Il partage donc le CPU du serveur. Les comptes, workspaces et fichiers synthétiques sont nettoyés. Le harnais refuse toute cible contenant déjà des utilisateurs et nécessite une activation explicite. Les premiers essais depuis le Mac étaient biaisés par le tunnel réseau ; ils ne servent pas à conclure sur la capacité CPU du serveur.

La file PostgreSQL durable est désormais implémentée et activée sur le VPS privé : admission bornée à 51 travaux, un par utilisateur, lease globale d'un traitement, trois tentatives maximum après interruption, clé de demande idempotente, quota/metadata/résultat validés dans une transaction. Le navigateur retrouve le statut après rechargement. Tests PostgreSQL réels : isolation RLS, limites, tokens de lease obsolètes, remboursement unique, reprise et révocation de reviews partielles.

Premier test avec la file (`43206d3`), clients interrogeant leur statut chaque seconde : 5/5, 15/15, 30/30 et 50/50 réussis ; P95 de réception des demandes 1,9 / 2,8 / 5,5 / 5,4 s. Fin des rendus P95 24,9 / 75,1 / 185,4 / 330,1 s. Aucun rendu perdu, mais les lectures intensives d'authentification et de statut chargent le CPU. La version finale réduit ce coût : vérification JWT par JWKS cache, suppression du double contrôle dans le proxy et polling espacé pendant l'attente. Mesures finales sur `3a0570f`, avec uploads concurrents puis traitement :

| Charge | Résultat | Réception P95 | Rendu P95 | Durée du lot |
| --- | --- | --- | --- | --- |
| 50 utilisateurs × 1 paire, 100 images HD | 50/50 succès | 8,3 s | 134,7 s | 143,1 s |
| 30 utilisateurs × 3 paires, 180 images HD | 30/30 succès | 4,7 s | 188,0 s | 197,9 s |

Les jobs sont traités progressivement, pas tous en parallèle sur les deux vCPU. Les sondes HTTP du second lot : 189 requêtes, zéro erreur, P95 143 ms. Pic mémoire application sur ces tests : 721 Mio, aucun OOM ni redémarrage non demandé. Les ZIP sont téléchargés intégralement et leur CRC est vérifié ; tous les comptes et objets de test sont nettoyés. Interruption réelle validée : redémarrage du conteneur web pendant un rendu de vingt images ; reprise à la deuxième tentative, résultat en 111,9 s après expiration du lease, ZIP 43 Mo vérifié et un seul essai consommé. Le rejeu de la même demande ne crée aucun export supplémentaire. Les objets synthétiques ont été supprimés.

## Sauvegarde et restauration

Sauvegarde cohérente hors ligne : arrêt temporaire du web puis des services d'écriture Supabase, dumps PostgreSQL et rôles, Storage, clés, configuration API et application ; redémarrage garanti par trap. Chiffrement age, clé privée conservée uniquement sur le Mac.

- Dernière archive vérifiée : `20260926T192655Z.tar.gz.age`, copiée chiffrée sur le volume de l’ancien VPS. Cette copie hors hôte a été rapatriée dans `~/.config/duoshot/backups/` sur le Mac pour vérifier sa restauration.
- Déchiffrement et restauration réelle dans une base temporaire réussis, tables Auth/Storage/application, nombres de lignes et activation RLS workspace vérifiés. Base temporaire supprimée ensuite.
- Cette vérification utilise `--no-owner --no-privileges` : elle ne valide pas à elle seule une restauration complète des rôles, droits, objets Storage et parcours utilisateur.
- Service automatique exécuté avec succès puis timer activé : une copie réussie par jour UTC, première tentative à 03:00 UTC, nouvelles tentatives horaires jusqu’à 23:00 si des rendus sont en attente. Brève interruption du web et des services d’écriture pendant la capture cohérente ; ce n’est pas une sauvegarde sans interruption.
- Sept dernières copies vérifiées conservées sur chaque VPS. Réception par clé SSH dédiée, limitée à l’IP DuoShot et à une commande de réception ; taille exacte, SHA-256 et publication atomique vérifiés. Une commande arbitraire via cette clé a été refusée.
- Aucun nouveau stockage payant : destination sur le volume existant de 15 Go de l’ancien VPS. Limite de réception 5 Gio par archive et réserve libre de 2 Gio ; surveiller la capacité avant croissance. Les journaux signalent les échecs, mais aucune alerte externe n’est encore configurée.
- Exercice de reprise complet des rôles/droits/Storage et parcours utilisateur encore nécessaire. Réappliquer les effacements intervenus après une sauvegarde avant de rouvrir une restauration. La clé de déchiffrement reste uniquement sur le Mac.

## Mixpanel et Stripe

Mixpanel EU est accessible. Projet `4067310`, workspace `4563765`. Pages vues et engagements reçus. Les événements serveur `export_succeeded` et `review_created` ont été reçus après les parcours réels du harnais sur des comptes synthétiques explicitement classés internes et consentants. Parcours navigateur complet et paiement encore à vérifier. Board préparé : [DuoShot — activation, paiements et reviews](https://eu.mixpanel.com/project/4067310/app/boards#id=11550070). Trois funnels avec audience externe uniquement : activation/téléchargement, checkout/abonnement actif, demande/création de review. Une valeur vide n'est pas une preuve d'absence de conversion ; seuls les utilisateurs consentants sont mesurés.

Stripe : le connecteur expose uniquement **Tech Master en mode test** (`acct_1UExSRClApGnRrWt`). Aucun compte DuoShot live accessible ; aucun paiement réel exécuté. Checkout et live restent désactivés sur le VPS. Vérifier compte live, produits/prix, webhook signé, abonnements et portail avant activation.

## Ancien VPS hébergeant Coolify

Ubuntu 24.04.4, noyau 6.8.0-110, redémarrage requis ; 22 conteneurs. Environ 2,5/3,7 Gio RAM utilisés, swap 1,9/2 Gio, racine 9,7 Go libres ; volume 15 Go presque vide. Trois zombies Node identifiés dans Umami (`umami-e107qp3wextcfcnfrubwefxr`), Postiz (`postiz-lms7f1jnmyafctfz8ufqud7q`) et l’application `cstkfox601t5jg25qir3wk9u-202909693424` ; échec cloud-init-hotplugd également observé. Index APT rafraîchis ; aucune mise à niveau, suppression Docker ou relance des projets existants effectuée. Prévoir sauvegarde/restauration vérifiée des autres projets et maintenance avant redémarrage. Le sudo non interactif de la connexion SSH n’est pas disponible ; ne pas interrompre leurs conteneurs pour trois zombies sans préparer leur maintenance. Ne pas tuer arbitrairement les parents des zombies.

## Étapes avant ouverture

1. Charge réelle 30/50 et reprise après interruption validées dans les scénarios ci-dessus. Prévoir les seuils de capacité disque et les alertes avant ouverture : ces tests ne garantissent pas un nombre illimité de lots maximum.
2. Sauvegarde automatique hors hôte et restauration logique vérifiées. Préparer les alertes et la reprise complète ; migrer les UUID/comptes/mots de passe/données et les fichiers Storage séparément.
3. **Accès source manquant** : fournir la connexion PostgreSQL source dans le fichier privé `~/.config/duoshot/source-database-url`, jamais dans le dépôt ou les logs. Configurer SMTP et Google OAuth.
4. Donner accès au compte Stripe production DuoShot ; valider un parcours réel autorisé et le webhook avant ouverture des paiements.
5. Vérifier la réception du funnel complet Mixpanel après consentement et le retrait du consentement. Renseigner l'identité légale réelle de l'éditeur avant publication.
6. Synchronisation finale, bascule DNS/HTTPS, contrôles de production, retour arrière compatible avec les écritures nouvelles. Conserver Vercel et Supabase Cloud tant que le remplacement n'est pas validé.

PR draft : https://github.com/Spocsk/DuoShot/pull/5, non fusionnée.
