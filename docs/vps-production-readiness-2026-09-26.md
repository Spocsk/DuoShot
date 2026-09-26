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

Image privée actuellement déployée : `ghcr.io/spocsk/duoshot:cb14b4b67f1b65b10b3bc6635cf9eb52e3ee01ad`.

## Corrections et validation

- Limites de sources, lots, pixels et ZIP : 50 Mio/source, 200 Mio/lot, 40 MP/source et intermédiaire, 100 Mio/ZIP. Validation des chemins propriétaires et métadonnées réelles.
- Attente des traitements en cours avant nettoyage sur erreur ; remboursements d'export idempotents.
- Images intermédiaires en mémoire brute : évite deux encodages PNG par rendu. Comparaison exacte des pixels réussie sur 12 combinaisons transparence/EXIF, cadrage et format. Test permanent contre la régression de prémultiplication alpha.
- Fontconfig et polices embarquées dans l'image ; fallback SVG vérifié.
- URL Supabase interne pour les services, identité du cookie public préservée, URL signées réécrites vers l'API publique prévue.
- Envoy : suppression du timeout fixe de 30 secondes pour Storage, délai d'inactivité 120 s et durée maximale 600 s ; query strings et Referer retirés des logs pour ne pas journaliser les tokens signés.
- SEO : langue HTML FR/EN, canonicals/sitemap du domaine final et noindex sur outil, compte et reviews. Voir [audit SEO/GEO](seo-geo-vps-2026-09-26.md). Le domaine public actuel conserve les anciennes erreurs jusqu'à la bascule.
- Retrait de Vercel Web Analytics. Analytics métier soumis au consentement ; erreurs de livraison Mixpanel détectées.

195 tests unitaires, TypeScript et lint réussis localement. CI applicative `36262616975` et image `36262613894` réussies pour `cb14b4b`. La CI précédente a également validé les 64 tests Cypress. Le contrôle Vercel de la PR échoue sur les limites de cron Hobby ; il ne représente pas le déploiement VPS.

## Tests réels sur la cible privée

1. Upload privé de 60 Mio, URL signée, téléchargement SHA-256 identique, accès anonyme refusé, objets synthétiques supprimés.
2. Trente téléchargements simultanés à froid de l'exemple : 30/30 réussis, ZIP CRC valide, 5,6–5,8 s. Ce test mesure le cache partagé de l'exemple, pas trente rendus personnalisés.
3. Compte gratuit : vingt images HD dans un ZIP de 43 Mo ; archive entièrement téléchargée et CRC vérifié. Récupération du téléchargement sans consommer un essai supplémentaire.
4. Isolation : téléchargement anonyme 401, autre utilisateur 404, sources d'un autre utilisateur 403. Review publique accessible, révocation réservée au propriétaire, médias devenus 410 après révocation.
5. Mesure avant optimisation (`3376a1e`) : vingt images en 42,6 s ; 5 rendus personnalisés simultanés réussis, P95 28,3 s. À 15 utilisateurs, 9 réussites et 6 rejets `RENDER_BUSY` après expiration de l'attente. Pic mémoire application 598 Mio, aucun OOM/redémarrage, swap inutilisée. Santé HTTP : 80 contrôles sans erreur, P95 95 ms.
6. Après optimisation (`cb14b4b`) : vingt images en 19,0 s (55 % plus rapide). 5/5 utilisateurs, P95 14,4 s ; 15/15, P95 36,1 s ; 30 utilisateurs : 20 réussites et 10 rejets `RENDER_BUSY`. Palier 50 non exécuté après cet échec. Pic mémoire 488 Mio, aucun OOM/redémarrage, 80 sondes de santé sans erreur (P95 79 ms). Les 51 comptes synthétiques et leurs fichiers ont été nettoyés.

Le générateur de charge s'exécute dans un conteneur séparé sur le même VPS, avec authentification réelle, upload, rendu et vérification CRC. Il partage donc le CPU du serveur. Les comptes, workspaces et fichiers synthétiques sont nettoyés. Le harnais refuse toute cible contenant déjà des utilisateurs et nécessite une activation explicite. Les premiers essais depuis le Mac étaient biaisés par le tunnel réseau ; ils ne servent pas à conclure sur la capacité CPU du serveur.

**La file PostgreSQL durable reste à implémenter.** Le sémaphore actuel protège la mémoire d'un processus, mais perd l'attente au redémarrage et rejette après 45 secondes. Il ne constitue ni une file persistante ni une limite globale multi-réplicas. L'objectif de plusieurs dizaines de rendus lourds simultanés n'est pas encore validé.

## Sauvegarde et restauration

Sauvegarde cohérente hors ligne : arrêt temporaire du web puis des services d'écriture Supabase, dumps PostgreSQL et rôles, Storage, clés, configuration API et application ; redémarrage garanti par trap. Chiffrement age, clé privée conservée uniquement sur le Mac.

- Dernière archive : `20260926T182816Z.tar.gz.age`, présente sur le VPS et copiée dans `~/.config/duoshot/backups/` sur le Mac.
- Déchiffrement et restauration réelle dans une base temporaire réussis, tables Auth/Storage/application, nombres de lignes et activation RLS workspace vérifiés. Base temporaire supprimée ensuite.
- Cette vérification utilise `--no-owner --no-privileges` : elle ne valide pas à elle seule une restauration complète des rôles, droits, objets Storage et parcours utilisateur.
- Sauvegardes automatiques hors hôte avec rétention, alerte et exercice de reprise complet encore nécessaires. Les timers de maintenance ne sont pas des sauvegardes.

## Mixpanel et Stripe

Mixpanel EU est accessible. Projet `4067310`, workspace `4563765`. Pages vues et engagements reçus. Les événements serveur `export_succeeded` et `review_created` ont été reçus après les parcours réels du harnais sur des comptes synthétiques explicitement classés internes et consentants. Parcours navigateur complet et paiement encore à vérifier. Board préparé : [DuoShot — activation, paiements et reviews](https://eu.mixpanel.com/project/4067310/app/boards#id=11550070). Trois funnels avec audience externe uniquement : activation/téléchargement, checkout/abonnement actif, demande/création de review. Une valeur vide n'est pas une preuve d'absence de conversion ; seuls les utilisateurs consentants sont mesurés.

Stripe : le connecteur expose uniquement **Tech Master en mode test** (`acct_1UExSRClApGnRrWt`). Aucun compte DuoShot live accessible ; aucun paiement réel exécuté. Checkout et live restent désactivés sur le VPS. Vérifier compte live, produits/prix, webhook signé, abonnements et portail avant activation.

## Ancien VPS hébergeant Coolify

Ubuntu 24.04.4, noyau 6.8.0-110, redémarrage requis ; 22 conteneurs. Environ 2,5/3,7 Gio RAM utilisés, swap 1,9/2 Gio, racine 9,7 Go libres ; volume 15 Go presque vide. Trois zombies Node et échec cloud-init-hotplugd observés. Index APT rafraîchis ; aucune mise à niveau, suppression Docker ou relance des projets existants effectuée. Prévoir sauvegarde/restauration vérifiée et maintenance avant redémarrage. Ne pas tuer arbitrairement les parents des zombies.

## Étapes avant ouverture

1. Finaliser capacité : file persistante, admission/idempotence, reprise après crash, remboursement unique, état récupérable côté client ; tests 30 utilisateurs puis pic de 50 avec plusieurs tailles de lots.
2. Automatiser et vérifier les sauvegardes hors hôte ; migration Supabase des UUID/comptes/mots de passe/données et fichiers Storage séparément.
3. **Accès source manquant** : fournir la connexion PostgreSQL source dans le fichier privé `~/.config/duoshot/source-database-url`, jamais dans le dépôt ou les logs. Configurer SMTP et Google OAuth.
4. Donner accès au compte Stripe production DuoShot ; valider un parcours réel autorisé et le webhook avant ouverture des paiements.
5. Vérifier la réception du funnel complet Mixpanel après consentement et le retrait du consentement. Renseigner l'identité légale réelle de l'éditeur avant publication.
6. Synchronisation finale, bascule DNS/HTTPS, contrôles de production, retour arrière compatible avec les écritures nouvelles. Conserver Vercel et Supabase Cloud tant que le remplacement n'est pas validé.

PR draft : https://github.com/Spocsk/DuoShot/pull/5, non fusionnée.
