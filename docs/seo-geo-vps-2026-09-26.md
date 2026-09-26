# Audit SEO / GEO — DuoShot, 26 septembre 2026

## Résumé exécutif

Les corrections techniques sont vérifiées sur le site privé du nouveau VPS ; le domaine public reste sur l'ancien déploiement Vercel. Ne pas confondre « corrigé dans l'image VPS » et « corrigé en production ». La migration des comptes et les contrôles fonctionnels conditionnent la bascule.

Le contrôle HTTP public constate encore une canonical vers `duoshot.vercel.app`, y compris dans le sitemap, et `lang="fr"` sur `/en`. Sur le VPS, les canonical ciblent `duoshot.site`, les langues FR/EN sont correctes et les pages d'outil, compte et revue portent `noindex, nofollow`.

## Scorecard

Notes indicatives sur le code et le déploiement **privé** inspectés, pas des mesures de visibilité dans Google ou les assistants.

| Axe | Note | Preuve / limite |
| --- | --- | --- |
| SEO technique | 8/10 | Canonical, langues, sitemap de 20 URL, robots et noindex vérifiés par HTTP. Bascule publique restante. |
| SEO on-page | 8/10 | Titres/descriptions, une H1 sur les pages marketing examinées, cartes sociales prévues. |
| Contenu & intent | 7/10 | Offre concrète, spécifications, explication des limites de l'IA et page de rejet. |
| Données structurées | 7/10 | Organization, SoftwareApplication, offres et FAQ issues des constantes produit. Éligibilité aux résultats enrichis non vérifiée. |
| Autorité & preuves | 3/10 | Les mentions de l'éditeur restent génériques ; identité et contact public à compléter avec des informations validées. |
| GEO / retrievability IA | 7/10 | Contenu explicite et accessible côté serveur, pages FR/EN. Aucune citation IA mesurée. |
| Présence externe | Non mesurée | Accès Search Console et preuves externes non fournis ; ne pas déduire l'indexation d'une réponse HTTP 200. |

## Findings

### P0 — Domaine canonique incorrect sur le déploiement public actuel

- **Observation** : `/`, `/en`, `/tool` et le sitemap public pointent vers `duoshot.vercel.app`.
- **Pourquoi c'est un problème** : le site annonce une autre origine comme version de référence.
- **Impact SEO/GEO** : signaux d'indexation et de consolidation incohérents.
- **Correctif recommandé** : conserver `NEXT_PUBLIC_SITE_URL=https://duoshot.site` lors du build et recontrôler après bascule. Déjà vérifié sur le VPS.
- **Fichiers** : `src/lib/site.ts`, `src/lib/seo.ts`, `src/app/sitemap.ts`.

### P1 — Langue et pages privées de l'ancien déploiement

- **Observation** : `/en` public annonce encore le français ; `/tool` public ne présente pas de meta noindex lors du contrôle. Le VPS corrige ces deux points.
- **Pourquoi c'est un problème** : mauvaise description de la langue et exposition de pages sans valeur d'acquisition.
- **Impact SEO/GEO** : compréhension linguistique et périmètre indexable moins précis.
- **Correctif recommandé** : publier les layouts FR/EN séparés et les métadonnées privées ; laisser les robots lire le noindex. Ne pas employer robots.txt comme protection des données.
- **Fichiers** : `src/app/(fr)/layout.tsx`, `src/app/en/layout.tsx`, `src/app/robots.ts`.

### P1 — Identité publique de l'éditeur incomplète

- **Observation** : les mentions indiquent seulement « exploitant du service » et des identifiants à compléter.
- **Pourquoi c'est un problème** : un visiteur ne peut pas identifier clairement l'entité responsable ou la contacter hors connexion.
- **Impact SEO/GEO** : confiance et rattachement de l'entité faibles.
- **Correctif recommandé** : renseigner les informations publiques exactes fournies par l'exploitant, puis lier l'Organization et ses profils officiels. Ne pas inventer SIRET, adresse, témoignages ou certifications.
- **Fichier** : `src/components/legal-pages.tsx`.

### P1 — Informations d'hébergement à aligner avec la migration

- **Observation** : le texte initial citait Vercel et Supabase Paris ; le serveur cible se trouve à Falkenstein.
- **Pourquoi c'est un problème** : la notice doit décrire l'infrastructure réellement utilisée.
- **Impact SEO/GEO** : cohérence des informations et confiance.
- **Correctif recommandé** : texte préparé pour Hetzner / Supabase auto-hébergé, Vercel restant chargé du domaine et du DNS. Publier avec la bascule, et vérifier les anciennes copies lors de la fin de migration.
- **Fichier** : `src/components/legal-pages.tsx`.
- **Coordonnées hébergeur vérifiées** : [mentions Hetzner](https://www.hetzner.com/legal/legal-notice/).

## Actions dans le code

- Réalisé : layouts FR/EN, canonical sur le domaine final, noindex des pages privées, sitemap et robots cohérents dans l'image VPS.
- Préparé : notice d'hébergement et version de politique au 26 septembre.
- À compléter avec les informations de l'éditeur : identité, contact public et liens officiels de l'entité.

## Actions sur le web

- Après bascule : contrôler le domaine final, redirections, TLS, sitemap, canonical et robots depuis l'extérieur.
- Utiliser Search Console pour l'inspection et la soumission du sitemap si l'accès est disponible.
- Contrôler les cartes sociales et les données structurées publiées ; aucun résultat enrichi ni classement n'est garanti.

## Quick wins / Chantiers structurants / Expérimentations

- **Quick wins** : livrer les corrections techniques déjà vérifiées avec la migration, compléter l'éditeur.
- **Chantiers structurants** : preuves de produit réelles, documentation des cas d'usage, suivi de l'indexation et des conversions.
- **Expérimentations** : `llms.txt` peut être étudié après les fondamentaux ; il n'est pas un prérequis ni une garantie de citation.

## Données manquantes pour compléter l'audit

Identité publique et contact de l'éditeur, accès Search Console, historique de trafic/conversion fiable, citations et liens externes vérifiables. L'inventaire automatique du skill ne reconnaît pas les routes `src/app` de ce dépôt : la liste a donc été vérifiée dans `MARKETING_ROUTE_PAIRS` et le sitemap HTTP.
