# DuoShot — état du projet et reste à faire (12 octobre 2026)

Document de synthèse, autonome : il peut servir de contexte de départ à une personne ou à un assistant IA qui reprend le projet. Il résume ce qui est livré, puis ce qui reste à faire, en priorité sur le **plan de trafic organique octobre → décembre 2026** (validé le 4 octobre, fichier `plan-trafic-organique-2026.md`, hors dépôt).

Sources : historique git (140 commits hors merges, du 21 septembre au 11 octobre), `README.md`, `docs/`, `docs/journal/`, le plan de trafic organique et DataFast (consulté le 12 octobre).

---

## 1. Le produit en une phrase

**DuoShot** (https://duoshot.site) est un atelier web qui prépare les captures App Store pour l'**iPhone Duo** (pliable Apple) : on importe ses vraies captures fermé/ouvert, on ajuste le cadrage, on lit un rapport de contrôle explicable, puis on télécharge un ZIP aux dimensions exactes (externe 5,4″ 1398×2034, interne 7,6″ 2007×2853, option 6,9″). Pas de chassis, pas d'IA générative : l'outil contrôle les pixels, il n'invente rien.

Cible : développeurs iOS indépendants (Indie) et studios/agences (Studio). App de démonstration fictive : **Harbor**.

### Calendrier Apple qui conditionne tout

| Date | Événement |
| --- | --- |
| 5 oct. 2026 | App Store Connect accepte les apps optimisées iPhone Duo (dépôt manuel des captures) |
| **16 oct. 2026** | Précommandes iPhone Duo — **lancement Product Hunt de DuoShot prévu ce jour** |
| **23 oct. 2026** | Disponibilité de l'iPhone Duo |
| Avril 2027 | Captures iPhone Duo obligatoires pour toute soumission (SDK iOS 27.1+) |

---

## 2. Ce qui a déjà été fait

### 2.1 Produit (outil)

- **Parcours en 4 étapes** avec barre de progression : créer un set (une orientation) → importer 1 à 10 captures par écran → inspecter et corriger chaque paire → rapport, confirmations humaines, export.
- **Aperçu sans compte**, téléchargement du ZIP avec compte. Démo Harbor en un clic, localisée FR/EN.
- **Contrôles** : dimensions exactes, JPEG/PNG, RGB, aplatissement de la transparence, complétude des paires, score de similarité fermé/ouvert (expliqué, sans faux positifs sur des écrans unis de couleurs différentes), détection de texte dans la zone du pli (OCR Tesseract servi par l'app). Le pli est placé sur le grand côté de la dalle ouverte (vérifié le 11 oct. sur les specs Apple).
- **Composition** : fit contain/cover/smart, fond uni/dégradé/flou, titre et sous-titre, couleur du texte incrusté ; aperçu identique à l'export.
- **ZIP** structuré par app et par écran + README ; préfixe client pour Studio ; sous-dossiers par taille pour le 6,9″.
- **Rendu** : file de travaux `render_jobs` traitée par un **worker de rendu autonome** (conteneur `render` séparé), gros exports livrés par URL signée (export paysage de 43 Mo validé en recette).
- **Studio** : 3 sièges, invitations, lien de revue client 7 jours avec décision et révocation, e-mails membres.
- **Connecteur App Store Connect** (derrière `ASC_CONNECTOR_ENABLED`) : clé d'API d'équipe chiffrée (AES-256-GCM), client typé ES256, voie de file dédiée, envoi avec rollback et remplacement sûr, bouton « Envoyer vers App Store Connect » sous « Télécharger le ZIP ». Au 4 oct., l'API Apple n'exposait **aucun type d'affichage Duo** : seul le 6,9″ est envoyable. Aucun envoi réel validé de bout en bout.
- **Liste d'attente** « Prévenez-moi » en double opt-in.
- Compte : export JSON de toutes les données, suppression du compte (y compris demande d'effacement Mixpanel historique).

### 2.2 Paiement

- Stripe Checkout **ouvert en live depuis le 4 octobre 2026**.
- Offres : Essai gratuit (2 ZIP HD), Indie 12 €/mois ou 120 €/an, Studio 49 €/mois ou 490 €/an, **Pass 30 jours 19 €** (codé, masqué tant que `STRIPE_PRICE_PASS30` n'est pas renseigné).
- Mention « TVA non applicable » (franchise en base) au lieu de « TTC ».
- Webhook signé qui projette l'état Stripe dans le workspace ; droits manuels séparés.

### 2.3 Infrastructure, sécurité, conformité

- Production **uniquement sur le VPS** (Hetzner, Docker Compose derrière Traefik), Supabase **auto-hébergé** (`api.duoshot.site`). Vercel ne sert plus qu'à rediriger `duoshot.vercel.app`.
- Image publiée sur GHCR après CI verte ; procédure de déploiement et rollback dans `infra/deploy.md`.
- Tâches planifiées en timers systemd (purge Storage, effacement analytique), sauvegardes chiffrées hors hôte avec restauration testée, monitoring de l'hôte, pare-feu Docker.
- CSP, HSTS, rate limiting par IP, secrets séparés (worker / cron), audit de dépendances en CI, Dependabot.
- Auth : Google OAuth, e-mail + mot de passe, magic link, récupération de mot de passe.
- E-mails transactionnels Resend avec partie HTML, reply-to et désinscription en un clic ; journalisation des envois sans adresse.
- RGPD : registre des traitements (`docs/ropa.md`), pages confidentialité / CGU / cookies / mentions / sous-traitants, consentement analytics.
- Qualité : Vitest + Cypress en CI sur chaque PR (toutes les routes publiques, redirections et images OG couvertes), types Supabase générés, module d'env validé au démarrage.

### 2.4 SEO / GEO technique (base du trafic organique)

- Canonical sur `duoshot.site`, i18n FR/EN servie par un seul arbre `app/[locale]`, hreflang, `noindex` sur les pages privées (outil, compte, revue).
- `sitemap.xml` (10 paires de pages FR/EN), `robots.txt` ouvert aux robots IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
- JSON-LD `Organization`, `SoftwareApplication` (avec offres) et `FAQPage`.
- `/llms.txt` à jour (statut Apple du 11 oct., prix, limites).
- Pages d'acquisition : `/specs` (tableau de dimensions daté, source Apple), `/rejet` – `/en/rejection` (décodeur de rejets), `/pourquoi-pas-ia` – `/en/why-not-ai`, `/pricing`.
- **Cartes sociales (OG) redessinées, une par page**, style Studio clair. Logo « Le pli » et icônes du site.
- Landing reconstruite autour du résultat livré (séquence animée GSAP chargée à la demande).
- Search Console : propriété de domaine vérifiée, `duoshot.site/` déjà indexée (inspection du 25 sept.).

### 2.5 Mesure

- **DataFast** seul outil d'analytics (Mixpanel retiré le 4 oct.), chargé après consentement, relais `/api/datafast/events` qui normalise les URL. Événements du funnel : `page_viewed`, `captures_added`, `account_created`, `export_succeeded`, `checkout_started`, `subscription_activated`, etc. Les UTM ne sont **pas** collectés : l'origine se lit par referrer.
- Connecteur DataFast **fonctionnel au 12 oct.** (le récap S1 le disait à ré-autoriser).

### 2.6 Plan de trafic organique : ce qui est en place

- Plan validé le 4 oct. : budget ~8 h/semaine, canaux X, vidéo courte, Reddit/forums, annuaires et Product Hunt.
- Chaîne de production des posts : brouillons rédigés par Claude (dimanche 18 h), validation en bloc par le fondateur, programmation dans **Postiz** (X, Threads, Instagram, YouTube).
- Automatisations : veille Apple quotidienne (8 h), récap KPI le lundi (9 h), brouillons du dimanche.
- Projet vidéo **Remotion** (`duoshot-video`) à partir de captures réelles du site.
- File de publication S2 prête : **16 posts + 3 vidéos du 12 au 16 oct.**
- **Fazier** : lancement fait, badge dans le pied de page (PR #52, CSP ajustée PR #53).
- Product Hunt **avancé au vendredi 16 oct. 2026 à 00 h 01 PT (9 h 01 Paris)**, jour des précommandes.

### 2.7 Point de départ chiffré (DataFast, 3 → 12 oct., visiteurs consentants uniquement)

| Indicateur | Valeur |
| --- | --- |
| Visiteurs | 10 (100 % nouveaux), 15 pages vues, rebond 60 % |
| Sources | X 6 · direct 2 · Google 1 · Facebook 1 |
| Pages d'entrée | `/` 9 · `/en` 3 · `/tool` 1 |
| Revenu / paiements | 0 € / 0 |

Côté produit (récap S1) : 0 inscription hors fondateur, 0 export, 0 pass, aucun événement Stripe. Le constat du plan se confirme : **sans post X, le trafic est quasi nul**, et Google n'apporte encore presque rien.

---

## 3. Ce qui reste à faire — plan de trafic organique

### 3.1 Corrections à faire dans le plan lui-même (avant de l'exécuter)

Le plan a été écrit le 4 oct. ; plusieurs hypothèses sont devenues fausses.

1. **« Paiements live prêts mais désactivés »** (§1) et **« Ouvrir les paiements, prérequis de Product Hunt »** (S5) : faux, Checkout est ouvert depuis le 4 oct. → cocher et retirer de S5.
2. **Le « Jour J » Apple est passé** (5 oct.) : le principe n°1, le kit Jour J (S4) et la section « Flottant » visent un événement qui a déjà eu lieu. Les remplacer par **trois pics restants** : précommandes **16 oct.**, sortie **23 oct.**, et l'**obligation d'avril 2027** (argument de fond pour tout le T1).
3. **Brouillons obsolètes** à réécrire avant publication : post X EN n°8 (« Apple says Duo uploads open later this year »), le post Reddit de valeur n°1 (même phrase) et le thread du kit Jour J (« slots are now open » → reformuler en « open since Oct 5, mandatory from April 2027 »).
4. **Tableau des annuaires (§6)** : Product Hunt encore daté du 17 nov. → 16 oct. ; Fazier → statut « fait », lien `fazier.com/launches/duoshot.site`.
5. Lien cassé : l'audit SEO est dans `docs/journal/seo-geo-vps-2026-09-26.md`, pas `docs/`.
6. Récap S1 : « Datafast non connecté » n'est plus vrai ; reporter les chiffres du §2.7 dans la ligne S1 du tableau KPI.
7. Les fichiers `docs/social/` (veille Apple, posts de la semaine) n'existent pas dans le dépôt : décider s'ils vivent seulement sur le Mac ou s'ils sont versionnés.

### 3.2 Urgent — cette semaine (12 → 16 oct.) : Product Hunt

Product Hunt est dans **4 jours**. Checklist :

- [ ] Page Product Hunt (ou « coming soon ») : tagline, description, 5 visuels 1270×760, vidéo de 30 s (Remotion), catégorie Developer Tools / iOS.
- [ ] Premier commentaire du maker rédigé (histoire, pourquoi pas d'IA, ce qui est vérifié vs ce qui ne l'est pas, prix, essai gratuit sans carte).
- [ ] Décider si le **Pass 30 jours** est activé pour le lancement (renseigner `STRIPE_PRICE_PASS30`) : c'est l'offre la plus adaptée à un dev qui prépare une seule sortie.
- [ ] **Achat réel + remboursement** par le fondateur avant le 16 : aucun achat de contrôle n'a été fait depuis l'ouverture du Checkout live. Un premier client qui échoue le jour du lancement coûterait cher.
- [ ] Vérifier le parcours complet en navigation privée et sur un vrai mobile (inscription, confirmation e-mail, 2 exports gratuits, téléchargement du ZIP ; Chrome avait montré `ERR_BLOCKED_BY_CLIENT` sur Storage en recette).
- [ ] Prévenir sa liste (abonnés X, inscrits liste d'attente) sans demander explicitement d'upvote.
- [ ] Être disponible toute la journée du 16 pour répondre ; thread X du lancement à 9 h 01.
- [ ] Laisser partir la file Postiz S2 et ajouter 3 réponses Reddit sur des fils « App Store screenshots ».

### 3.3 S3 — 19 → 25 oct. : sortie de l'iPhone Duo (23 oct.)

- [ ] Reprendre le kit Jour J pour le **23 oct.** : thread X EN + FR, vidéo « iPhone Duo is out — here are the exact screenshot sizes », commentaire pour les fils d'actu r/apple et r/iOSProgramming, liste de comptes médias Apple auxquels répondre.
- [ ] Vérifier le jour même les dimensions officielles et mettre à jour `/specs` et `/llms.txt` si Apple change quoi que ce soit.
- [ ] Post de valeur Reddit n°1 (r/iOSProgramming), réécrit (cf. §3.1).
- [ ] Indie Hackers : premier post build in public, avec les vrais chiffres du lancement PH.
- [ ] **Annuaires lot 1** restants : DevHunt, Uneed, Microlaunch, TinyLaunch, BetaList (Fazier fait). Préparer la fiche commune une fois pour toutes : tagline, description 160 caractères, 3 visuels, vidéo 30 s.

### 3.4 S1 non fait — fondations à rattraper

- [ ] Bios et lien `duoshot.site` sur X, TikTok, Instagram, YouTube, Reddit, Indie Hackers (à vérifier compte par compte).
- [ ] Search Console : **soumettre `https://duoshot.site/sitemap.xml`** (aucun sitemap référent n'était détecté le 25 sept.) et inspecter `/`, `/en`, `/specs`, `/en/specs`, `/pricing`, `/en/pricing`. Ajouter aussi Bing Webmaster Tools (qui alimente ChatGPT Search et Copilot).
- [ ] **Panel GEO J0** : 10 questions × 3 moteurs (ChatGPT Search, Perplexity, Gemini), protocole dans `docs/commercial-learning.md`. Le faire **avant** le pic du 16–23 oct., sinon la comparaison J30 perd son sens.
- [ ] Banque d'assets : 6 clips bruts (import, recadrage, rapport, ZIP, revue client, comparaison de dalles) et 10 visuels avant/après Harbor.
- [ ] Lire et noter les règles de promotion de r/iOSProgramming, r/SwiftUI, r/swift, r/AppStoreOptimization, r/indiehackers, r/SideProject, r/apple.

### 3.5 S4 — 26 oct. → 1er nov.

- [ ] **Annuaires lot 2** : SaaSHub, AlternativeTo (alternative à Figma / Previewed / AppLaunchpad / AppScreens), Peerlist Launchpad, Indie Hackers Products.
- [ ] Recontacter 5 devs pour une observation de 30 min (brouillons dans `docs/commercial-learning.md`, à valider avant envoi) ; viser aussi 3 studios.
- [ ] Veille quotidienne : Apple Developer News, statut App Store Connect, alertes X « Duo screenshots » (déjà automatisée le matin : vérifier qu'elle remonte bien les nouveautés de l'API).

### 3.6 S5–S7 — 2 → 22 nov.

- [ ] Recueillir 2–3 retours réels de devs, publiables **avec accord écrit**.
- [ ] **Panel GEO J30** (même protocole que J0).
- [ ] **Show HN le jeudi 19 nov.** : « Show HN: DuoShot – prepare iPhone Duo App Store screenshots without AI », ton sobre et technique. À garder en novembre : avoir les premiers retours et chiffres réels rend le post plus solide.
- [ ] Thread X récap et coulisses sur r/SideProject / Indie Hackers.
- [ ] Objectif de processus : **10 annuaires soumis avant le 15 nov.**

### 3.7 S8–S12 — 23 nov. → 31 déc.

- [ ] Black Friday (optionnel) : coupon Stripe limité sur le plan annuel, annoncé sur X et dans les annuaires qui listent les deals.
- [ ] Contenu « préparez vos captures avant la fermeture de fin d'année d'App Store Connect » (vérifier les dates officielles début décembre).
- [ ] Série « 12 jours de tips captures App Store » (30 nov. → 20 déc.) : alpha, dimensions, charnière, ordre, localisation, paysage/portrait, lisibilité 5,4″, cohérence des paires, revue client, nommage, vérification avant dépôt, récap.
- [ ] Bilan « 3 mois de DuoShot » (trafic, inscriptions, exports, ventes) et choix du canal prioritaire pour le T1 2027.

### 3.8 Rituel hebdomadaire à tenir

| Bloc | Quand | Temps |
| --- | --- | --- |
| X : 1 post/jour ouvré (Postiz) + 1 post FR/semaine | dimanche, en lot | 1 h |
| X : réponses aux devs iOS (#iOSDev, #indiedev, #buildinpublic) | 20 min/jour | 1 h 40 |
| Vidéo : 1 tournage → TikTok, Reel, Short, vidéo X, GIF Reddit | mercredi | 2 h |
| Reddit/forums : 4–5 réponses utiles, 1 post de valeur toutes les 2 semaines (règle 90/10) | 15 min/jour | 1 h 30 |
| Annuaires et lancements | jeudi | 1 h |
| KPI DataFast + Search Console, ajustements | lundi | 30 min |

Objectifs de processus : cadence X ≥ 80 % des jours ouvrés, 1 vidéo/semaine, 10 annuaires avant le 15 nov., Product Hunt et Show HN lancés. Chiffres réels uniquement, aucun témoignage sans accord.

---

## 4. Ce qui manque au plan (recommandations)

Le plan repose surtout sur des posts qui meurent en 24 h ; le site n'a **aucun contenu éditorial** et l'autorité est notée 3/10. Pour que le trafic dure après les pics d'octobre :

1. **Pages qui répondent aux requêtes, pas seulement des posts.** Le panel GEO liste déjà les intentions. Pages candidates (FR + EN, factuelles, datées, sources Apple) :
   - « iPhone Duo : captures obligatoires en avril 2027 — ce qui change » (requête qui va monter tout l'hiver) ;
   - « Comment préparer les captures fermé et ouvert iPhone Duo » (guide pas à pas avec Harbor) ;
   - « Erreurs App Store Connect : dimensions et transparence » (compléter `/rejet`) ;
   - « Faire valider ses captures par un client avant le dépôt » (page Studio) ;
   - un comparatif honnête DuoShot / App Asset Kit / SnapMonk / AppScreens.
   Chaque page entre dans `MARKETING_ROUTE_PAIRS` (sitemap + hreflang) et reçoit sa carte OG.
2. **Identité de l'éditeur** : SIRET et siège sont encore « à compléter » dans les mentions légales. C'est le premier signal de confiance manquant (SEO, GEO, et visiteurs Product Hunt). Lier ensuite l'`Organization` JSON-LD aux profils officiels (X, Product Hunt, GitHub).
3. **Connecteur ASC et Duo** : Apple accepte les apps Duo depuis le 5 oct. Revérifier l'énumération `ScreenshotDisplayType` de l'API ; si un type Duo existe, l'ajouter dans `src/lib/asc/config.ts`, tester un envoi réel, et « envoi direct des captures Duo vers App Store Connect » devient l'argument différenciant le plus fort du lancement. Tant que ce n'est pas testé, ne pas l'annoncer.
4. **Attribution des campagnes** : le relais DataFast ne garde pas les UTM. Le referrer suffit pour X/Reddit/PH, mais pas pour distinguer deux posts X ou les e-mails. Option : utiliser le paramètre `ref` (supporté par les filtres DataFast) sur les liens de bio et de lancement.
5. **Mesurer les inscriptions par canal** : le tableau KPI demande « inscriptions / exports / ventes » par semaine ; prévoir la requête Supabase (`export_sets`, comptes) qui exclut les comptes internes (`ANALYTICS_INTERNAL_USER_IDS`), pour que le récap du lundi soit automatique.

---

## 5. Reste à faire hors trafic (produit, business, technique)

| Priorité | Tâche |
| --- | --- |
| P0 | Achat réel + remboursement par le fondateur (avant le 16 oct.) |
| P0 | Validation fiscale et décision Stripe Tax (désactivé aujourd'hui) |
| P0 | Test du téléchargement du ZIP sur un vrai mobile et un Chrome vierge |
| P1 | Activer ou non le Pass 30 jours (`STRIPE_PRICE_PASS30`) |
| P1 | Premier envoi réel App Store Connect (6,9″, puis Duo si l'API le permet) et activation de `ASC_CONNECTOR_ENABLED` |
| P1 | Renseigner SIRET / siège dans les mentions légales |
| P1 | Observations utilisateurs : 5 devs + 3 studios (seuils : 5 autonomes, 3 achats, 2 studios avec un second projet) |
| P2 | Mettre à jour `PRODUCT.md` (il dit encore que le paiement live est fermé et qu'aucun dépôt Duo n'est possible) |
| P2 | Traiter les PR Dependabot ouvertes (stripe 23, vitest 5, TypeScript 7, actions GitHub…) ; les montées majeures demandent des tests |
| P2 | Supprimer le projet Mixpanel UE une fois la file d'effacement vidée, puis retirer le code associé |
| Plus tard | Selon les preuves au bilan J30 : achat par projet, synchronisation des projets entre appareils, localisation multi-langues des captures |
