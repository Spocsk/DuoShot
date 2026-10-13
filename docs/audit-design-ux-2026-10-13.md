# Audit design, UX et produit — 13 octobre 2026

Audit du dépôt à la révision `53d5dea` (main) et de l'application lancée localement, sans base de données ni Stripe. Il couvre trois couches : le design visuel au regard de `DESIGN.md`, l'expérience des parcours (landing → atelier → inscription → export, compte, Studio, revue client) et le produit tel qu'il est livré et vendu. Il prolonge l'audit de viabilité du 23 septembre (`journal/audit-viabilite-2026-09-23.md`) sans le répéter. Les captures citées sont dans `audit/2026-10-13/`.

## 1. Résumé

Le socle est solide : la landing prouve le résultat avec le vrai couple d'écrans, l'atelier a une hiérarchie claire en quatre étapes, les textes ne promettent plus l'approbation Apple, et le statut App Store Connect est daté et sourcé. Les problèmes qui restent sont concentrés sur la conversion et sur une dette de système de design accumulée dans `src/app/studio.css`.

Trois constats bloquent ou cassent une conversion et doivent passer avant tout travail visuel :

| # | Constat | Où | Preuve |
| --- | --- | --- | --- |
| P0-1 | Les pages Connexion, Créer un compte et la modale d'inscription de l'atelier affichent les clés brutes `google`, `email`, `password`, `magic` à la place des libellés. Régression du 4 octobre (`feacf9e`), présente sur `main`. | `src/components/auth-form.tsx:172,206,220,280` ; cause dans `src/lib/i18n/client-boundary.test.ts` (regex des clés) | `login.desktop.fr.png`, `signup.mobile.fr.png`, `tool-guest-auth-modal.desktop.fr.png` |
| P0-2 | Un visiteur qui importe ses captures puis crée un compte au moment du téléchargement perd son travail : l'atelier se recrée vide et seul un lien peu visible « Récupérer explicitement les brouillons anonymes ou anciens dans ce compte » permet de le retrouver, après rechargement. | `src/components/tool-app.tsx:98` (`key={owner}`), `src/lib/sets-store.ts:146-159` | `tool-after-login-drafts-lost.desktop.fr.png` |
| P0-3 | Le paywall s'ouvre pour un visiteur non connecté (bascule 6,9″ dans Réglages avancés) avec les boutons désactivés et le message « Les paiements ne sont pas encore ouverts », faux dès que Stripe est actif. Le clic ne mène ni à l'inscription ni au paiement. | `src/components/paywall-modal.tsx:38`, `src/components/tool/adjust-panel.tsx:223`, `src/components/tool-app.tsx:479` | `tool-guest-paywall-69.desktop.fr.png` |

Décision proposée : corriger ces trois points cette semaine (chacun tient en un petit commit), puis traiter la cohérence commerciale (section 3) et seulement ensuite la consolidation du CSS (section 5).

## 2. Méthode et limites

- Lecture du code (`src/components`, `src/app`, `src/lib/i18n`, `src/lib/plans.ts`, feuilles de style) et de `DESIGN.md`, `PRODUCT.md`, journal.
- Application lancée avec `next dev`, variables Supabase factices, `E2E_CHECKOUT_DISPLAY=true`. Parcours automatisés avec Chromium à 390×844 et 1440×900 (plus 1440×800 pour le pli), en français et en anglais, mouvement réduit. 88 combinaisons page × viewport × langue mesurées, 57 captures conservées.
- Mesures : hauteur de page, titres h1–h6, tailles de police calculées inférieures à 12 px, cibles interactives inférieures à 24 px, contraste WCAG texte/fond, présence d'un anneau de focus au clavier, libellés de champs, noms accessibles des boutons.
- Compte simulé par cookie et interception de `/auth/v1/user` et `/api/billing/status` (même procédé que `cypress/support/commands.ts`), plans free, indie et studio.
- Limites : pas de base, donc pas de vrai export ni de Checkout ; les captures incluent l'indicateur de développement Next.js en bas à gauche ; le badge Fazier du pied de page est cassé hors ligne ; aucun test utilisateur réel. Les polices Geist et IBM Plex Mono se sont chargées normalement.

## 3. Produit livré et cohérence commerciale

### 3.1 Suivi des écarts P0 de septembre

| Écart de septembre | État au 13 octobre |
| --- | --- |
| Export du ZIP dans la réponse de fonction (limite 4,5 Mo) | Traité : téléchargement par `/api/exports/[id]/download` et URL signée, exports de 43 Mo validés le 25 septembre. |
| Promesses « zéro rejet », « ZIP accepté par Connect » | Traité : la landing, le score et la revue répètent « ne prédit pas l'approbation Apple ». |
| Vraies captures fermé/ouvert non attestées | Traité : confirmation humaine obligatoire avant export, alerte de similarité, sources listées par paire. |
| Statut Connect | Traité : bandeau daté « Vérifié le 13 octobre 2026 », état `open` dans `src/lib/apple-screenshot-status.ts`, lien vers l'annonce Apple. |
| Studio « 3 sièges bientôt » | Traité dans le texte (« 3 sièges · liens de validation actifs 7 jours »), mais la clé s'appelle encore `pricing_seats_soon`. |
| Grille d'offres divergente entre PRODUCT.md, README et code | Partiellement : prix et quotas alignés, mais le Pass 30 jours (19 €) existe dans le code et pas dans `PRODUCT.md`, et la TVA est décrite différemment (voir 3.3). |

### 3.2 Promesse et livrable

- La proposition tient en une phrase vérifiable sur la landing : importer fermé/ouvert, cadrer, vérifier, exporter deux séries opaques aux dimensions Connect. La preuve avant/après utilise les vrais noms de fichiers et poids du ZIP exemple. C'est le point fort du produit.
- Le connecteur App Store Connect est présenté dans le compte comme un envoi « sans passer par le ZIP », puis immédiatement nuancé : l'API Apple n'accepte pas encore le format Duo, seuls les sets 6,9″ partent. Pour l'acheteur Duo, c'est un argument qui ne s'applique pas à lui. `DESIGN.md` est en plus contradictoire : la section Components décrit l'envoi vers Connect, la liste des interdits dit « ne pas laisser entendre que DuoShot téléverse vers App Store Connect ».
- Le ZIP exemple Harbor ne peut pas être téléchargé tant que l'utilisateur n'a pas coché « J'ai compris que Harbor est une app fictive… » dans Vérifier (`demo-dock-review` : « Avant de préparer les fichiers : Confirmer le contenu de l'app »). Demander une confirmation de bonne foi sur un exemple fourni par DuoShot est une friction inutile sur le premier contact avec le livrable.
- Le résultat livré reste un ZIP à décompresser et déposer à la main. L'écran Exporter liste les fichiers avec leurs dimensions, ce qui est bien, mais ne dit pas où les déposer dans Connect (emplacement iPhone Duo, fermé puis ouvert). Une ligne de mode opératoire ou un lien vers `/specs` à cet endroit raccourcirait le dernier kilomètre.

### 3.3 Grille tarifaire et vocabulaire

- Prix et quotas sont justes partout (12 €, 49 €, 120 €, 490 €, 2 exports, 100 par jour) mais sont écrits en dur dans la copie plutôt que lus depuis `src/lib/plans.ts` : `paywall_cta_*`, `paywall_*_year`, `pricing_indie_cta` (réutilisé dans `account-app.tsx:174`), `pricing_studio_cta`, `paywall_lead`, `faq.ts`, et les métadonnées de `src/app/[locale]/pricing/page.tsx:6-7`. Un changement de prix demande aujourd'hui une recherche dans quatre fichiers.
- Le plan gratuit porte quatre noms : « Free » (`PRODUCT.md`, et `pricing_free_title` = « Free » dans les deux langues, clé inutilisée), « Essai » (`DESIGN.md`), « Essai gratuit » (carte), « Essai / Trial » (compte).
- L'unité du quota porte quatre noms : exports (`PRODUCT.md`), « 2 sets gratuits » (`paywall_title`), « 2 ZIP » (`error_trial`, `pricing_trial_*`, bouton « Créer un compte — 2 ZIP HD »), « essais restants » (`tool_remaining`, pilule de l'atelier). L'utilisateur voit « 2 ZIP HD » sur la carte, « 2 essais restants » dans l'atelier et « Vos 2 sets gratuits sont utilisés » dans le paywall.
- `pricing_note` affirme la franchise de TVA (art. 293 B) alors que `PRODUCT.md` dit que « le total Stripe et les taxes applicables doivent être confirmés ». Une des deux sources est périmée.
- `pricing_local_projects` (« Les projets sont enregistrés sur cet appareil et ne sont pas encore synchronisés entre membres ») est affiché dans la bande Studio à 49 €/mois. C'est honnête, mais placé sous le prix cela se lit comme un défaut de l'offre. Le déplacer dans la FAQ Studio et formuler positivement ce qui est partagé (sièges, liens de validation) serait plus juste.
- Sur la home, les boutons Indie et Studio s'affichent d'abord « Paiements bientôt ouverts » (désactivés) pour tout visiteur, parce que la section compacte ne reçoit pas le drapeau serveur et attend un appel `/api/billing/availability` (`home-page.tsx:296`, `pricing-cta.tsx:29-34`). `/pricing`, lui, reçoit le drapeau et affiche les boutons actifs. Même quand Stripe est ouvert, la home montre donc un instant « bientôt ouverts » ; si Checkout reste fermé en production, c'est l'état permanent et il dit « bientôt » sans date.
- Le Pass 30 jours n'apparaît jamais sur la home (`passAvailable` par défaut à false) et n'est pas documenté dans `PRODUCT.md`.
- Journal : `/api/billing/availability` répondait `{checkoutAvailable: false}` le 3 octobre après l'installation des clés live. L'état réel de l'activation commerciale n'est pas lisible depuis le dépôt ; le rapport ne le présume pas.

## 4. Parcours et UX

### 4.1 Landing (`home-page.tsx`)

Ce qui marche : le héros tient au-dessus du pli à 1440×800 et à 390×844 avec les deux écrans entièrement visibles et leurs dimensions (`home-fold-800.desktop.fr.png`, `home-fold.mobile.fr.png`) ; un seul h1, h2 par section, FAQ en `details` ; la preuve avant/après est concrète.

À corriger :

- Deux boutons primaires en concurrence dans le même écran : « Créer un compte » (graphite) dans l'en-tête et « Préparer mes captures » (graphite) dans le héros (`header-auth.tsx:66`). `DESIGN.md` demande une revendication et deux actions ; l'en-tête devrait passer en lien ou en bouton secondaire sur la home.
- Pas d'appel à l'action après la FAQ : la page se termine sur un accordéon puis le pied de page. Reprendre « Préparer mes captures » en clôture.
- « Ouvrir l'exemple dans l'outil » (section preuve) et « Voir l'exemple » (héros) mènent au même endroit. Garder un libellé unique.
- Hauteur à 390 px : 6 339 px en français, 6 224 px en anglais, contre « près de 6 000 px » visés par `DESIGN.md`. La section preuve (1 439 px) et la section tarifs (1 358 px) portent l'excédent.
- La bascule « Mensuel / Annuel · 2 mois offerts » est présente sur la home ; elle ajoute une décision à un visiteur qui n'a pas encore compris l'offre. Elle a sa place sur `/pricing`.
- Le badge Fazier du pied de page a un libellé en anglais seulement et, cassé, affiche son texte alternatif dans le cadre (`site-chrome.tsx:86-95`).

### 4.2 Atelier (`tool-app.tsx` et `src/components/tool/*`)

Ce qui marche : la barre d'étapes 1–4 avec état « terminée / en cours / à faire », le canevas qui annonce les dimensions cibles dans les emplacements vides, la liste « À faire » qui renvoie vers l'étape concernée, le score présenté comme information secondaire, la bascule Fermé / Ouvert / Comparer sur téléphone.

À corriger, par ordre d'impact :

1. **Perte des brouillons à la connexion** (P0-2). Le parcours mesuré : import de deux captures en invité → « Préparer les fichiers » → modale d'inscription → connexion → atelier vide avec « 2 essais restants » et zéro image (`after-login-drafts` : `imagesVisible: 0`). La migration doit être automatique au premier passage de « guest » à un compte, avec un message de confirmation, et le lien actuel devenir un secours.
2. **Paywall invité** (P0-3). Soit masquer la bascule 6,9″ pour un invité et la remplacer par « Disponible avec Indie — créer un compte », soit ouvrir l'inscription avant le paywall.
3. **Message d'état contradictoire** : après fermeture de la modale, le dock affiche « Connectez-vous pour télécharger le ZIP » alors que la modale s'ouvre en mode « Deux ZIP HD pour commencer » (inscription) (`use-render-jobs.ts:157-160`). Aligner sur « Créez un compte ou connectez-vous ».
4. **Deux chemins d'inscription** depuis l'export : la modale (reste dans l'atelier) et le lien « Créer un compte » de `delivery-actions.tsx:111` qui quitte vers `/signup`. Garder la modale.
5. **Messages affichés uniquement sur Vérifier et Exporter** (`tool-app.tsx:763`) : les fichiers ignorés à l'import (`:384`) et les erreurs de Checkout (`:479,489`) ne s'affichent pas si l'utilisateur est sur Importer ou Ajuster. Mesuré : à l'import, seul le bandeau « Des points demandent votre attention dans Vérifier » apparaît.
6. **Trois états vides superposés** sur l'atelier neuf : encart « Commencez par une paire de captures » + emplacements du canevas avec bouton Importer + phrase « Importez votre première paire, ou essayez l'exemple Harbor » sous le canevas, plus le panneau Importer à droite (`tool-empty.desktop.fr.png`). Un seul état vide, celui du canevas, suffit ; l'encart Harbor peut devenir une ligne.
7. **Suppression d'un set sans confirmation** alors qu'elle efface les fichiers IndexedDB (`set-picker.tsx:180-190`).
8. **Titres** : le h1 est le nom du set et disparaît pendant le renommage (`set-title.tsx:19-42`) ; la modale d'inscription ajoute un second h1 à la page (`auth-form.tsx:164`, mesuré : `h1s: ["Composition 01", "Deux ZIP HD pour commencer"]`) ; Vérifier a deux h2 (« Vérifier » et « Bilan du set »).
9. **Nommage** : l'onglet dit « Importer », le panneau dit « Vos captures » ; `DESIGN.md` décrit trois panneaux Captures / Adjust / Check alors que l'atelier en a quatre.
10. **Dock collant translucide** : le bouton principal reste visible, mais le dégradé laisse voir les champs qui passent dessous (« Nom de l'app », curseur Vertical), ce qui se lit comme un chevauchement (`tool-demo-adjust.desktop.fr.png`, `tool-demo-captures.mobile.fr.png`). Fond opaque sur la hauteur du bouton, dégradé au-dessus seulement.
11. **Libellé** « Récupérer explicitement les brouillons anonymes ou anciens dans ce compte » : jargon interne (« explicitement », « anonymes »). Dire « Retrouver mes brouillons de cet appareil ».
12. Quatre styles de chargement (`<p role=status>` nu, « … », pilule, shimmer) et cinq variantes de contrôle segmenté (`Seg`, review-view-switch, tool-adjust-side, tool-mobile-view, crop-fit) ; le toggle charnière de la revue est refait à la main au lieu de `DsToggle` (`review-page.tsx:151-161`). La réinitialisation d'état (quatre `set*`) est copiée neuf fois dans `tool-app.tsx`.

### 4.3 Conversion depuis `/pricing`

- Visiteur non connecté qui clique « Indie — 12 €/mois » : redirection vers `/tool?upgrade=1&plan=indie_monthly` et ouverture de la modale d'inscription, qui affiche les clés brutes (P0-1). Le visiteur arrive dans un atelier vide alors qu'il voulait payer ; après connexion le paywall s'ouvre avec le plan présélectionné. C'est correct techniquement mais déroutant : rien ne dit « créez un compte pour continuer vers le paiement ». Ajouter un en-tête de modale spécifique quand `upgrade=1`.
- La carte Essai gratuit mène à `/signup` (`pricing-section.tsx:85`) alors que `DESIGN.md` demande « aperçu avant inscription, compte au téléchargement ». Pointer vers `/tool`.
- `/pricing` empile deux FAQ : « Questions sur les offres » puis « FAQ » générale (`pricing-page.tsx:29-32`), avec un paragraphe de rétention orphelin entre les deux (`pricing.desktop.fr.png`). Fusionner ou renvoyer vers la FAQ de la home.
- Hiérarchie : h1 puis h3 pour les cartes, h2 ensuite ; le niveau h2 est sauté.

### 4.4 Compte (`account-app.tsx`)

- Rôles affichés bruts « owner » / « member » (`:339`) et statut de revue brut « pending · expire 19 oct. 2026 » (`:379`) alors que la page de revue a sa propre table de statuts (`account-studio.desktop.fr.png`).
- Erreurs brutes montrées à l'utilisateur : « Checkout indisponible » (`:60`), code `BILLING_UNAVAILABLE` ou `payload.error` (`:77`), `error.message` de la déconnexion (`:134`). Échecs réseau silencieux dans la section Studio (`:248-266`).
- Suppression du compte par `confirm()` natif (`:94`) au lieu de la boîte de dialogue partagée ; export JSON sans état de chargement ni d'erreur (`:82-91`).
- Le champ d'invitation n'a qu'un libellé pour lecteur d'écran (`:319`), contre la règle « libellés visibles » de `DESIGN.md`.
- Redirection vers la connexion sans paramètre `next` (`:40`). Seuls les comptes gratuits voient un appel à l'action vers l'offre ; les comptes Indie n'ont pas de lien vers l'atelier (`:164-187`).
- Hiérarchie correcte (h1 Compte, h2 Équipe et reviews, h3 Validations récentes, h2 App Store Connect).

### 4.5 Authentification (`auth-form.tsx`, `password-recovery.tsx`)

- P0-1 : libellés remplacés par les clés. Cause : la liste `CLIENT_KEYS` est générée par une expression qui n'accepte que des clés contenant un `_` (`client-boundary.test.ts`, `keysIn`) ; `google`, `email`, `password`, `magic` n'y entrent jamais, `getClientMessages` ne les envoie pas, et le test passe. Correction : renommer les quatre clés (`auth_google`, `auth_email`, `auth_password`, `auth_magic`) ou étendre l'expression, puis `npm run i18n:keys`. Ajouter au test une vérification des clés rendues côté client sans `_`.
- À l'inscription, double consentement : phrase « En continuant, vous acceptez… » et case obligatoire « J'accepte… » (`:176-200`, `:248-272`), texte écrit en ternaire FR/EN dans le JSX et non dans les dictionnaires. L'inscription Google saute la case.
- Erreurs Supabase renvoyées en anglais dans l'interface française (`:71,87,153`), repli « Erreur » même en anglais (`:136`). `minLength=8` appliqué aussi à la connexion (`:225`).
- Cartes `studio-auth-card` propres et centrées ; c'est le seul gabarit de page à carte.

### 4.6 Revue client et invitation

- `/r/harbor` montre l'en-tête marketing complet avec « Créer un compte » à un client venu valider des captures (`review-harbor.desktop.fr.png`). Un en-tête réduit (logo, langue) protège l'expérience du client de l'acheteur Studio.
- La vue « Aperçu appareil » et le héros de la landing montrent les captures dans une coque, le canevas de l'atelier les montre nues (« la coque disparaît du ZIP »), et la décision S01 du journal disait « frames gelés, aucun châssis ». Trois représentations du même livrable coexistent ; le client qui valide voit une coque qui n'existera pas dans App Store Connect.
- État « introuvable » sans h1 (`review-page.tsx:90`) ; « Portrait » codé en dur (`:122`).
- `/invite/[token]` est la seule page sans en-tête ni pied de page ; l'erreur n'a pas de `role` (`invite-accept.tsx:41`) ; les erreurs réseau ne sont pas attrapées (`:13-21`) ; l'état d'erreur mesuré affiche simplement « Rejoindre le workspace / Connectez-vous avec l'adresse invitée » sans dire que le lien est invalide.

### 4.7 Pages secondaires

- `/rejet` n'a aucun appel à l'action primaire, seulement des liens « Ouvrir l'outil » ; les codes « transparence / alpha » sont bilingues dans les deux langues (`rejection-page.tsx:9-13`).
- `/pourquoi-pas-ia` affiche le libellé « Listing exemple — ce n'est pas le produit » hors contexte (`why-not-ai-page.tsx:23`).
- Mentions légales écrites en JSX bilingue (`legal-pages.tsx`, 429 lignes) et non dans les dictionnaires ; la version française indique encore un SIRET en attente.

## 5. Design visuel

### 5.1 Deux systèmes superposés

`src/app/studio.css` (700 lignes) est chargé après `globals.css` (`document-layout.tsx:7-10`) et redéfinit `.ds-cta`, `.ds-cta-ghost`, `.ds-input`, `.ds-pill`, `.ds-label`, `.ds-dialog` et `:focus-visible` (lignes 16-35). Plusieurs règles y sont déclarées deux fois avec des valeurs différentes (`.studio-tool-inspector` 304/456/542, `.ds-readiness` 306/485, `.tool-empty-action` 436/682). Le fichier contient environ 133 couleurs hexadécimales distinctes hors tokens, dont des quasi-doublons de tokens existants : `#276b7a` (focus), `#175d70` (liens), `#4e7b84`, `#263b42`, `#46606a`, `#597078`, `#fff` 21 fois. `globals.css` ajoute un rouge et un ambre d'erreur non tokenisés (`:498-500`, `:1635-1654`). Le `.tsx` est, lui, presque entièrement conforme (seules exceptions : couleurs du logo Google, contenu Harbor, thème OpenGraph copié dans `src/lib/og/theme.ts`).

Recommandation : créer les tokens manquants (`--studio-link`, `--studio-focus`, `--studio-danger`, `--studio-danger-soft`, `--studio-canvas-2`), remplacer les hex de `studio.css` par ces tokens, supprimer les redéfinitions de `.ds-*` en les fusionnant dans `globals.css`, puis documenter dans `DESIGN.md` les tokens déjà présents mais absents du frontmatter (`sea-wash`, `ok-soft`, `review-soft`, `deep-muted`). `--studio-review-soft` existe et n'est jamais utilisé alors que `#f8eee8` est codé en dur pour le même rôle.

### 5.2 Mesures

| Sujet | Règle `DESIGN.md` | Mesuré |
| --- | --- | --- |
| Anneau de focus | Un style | Trois couleurs au clavier sur la même page : encre `#172126`, `#276b7a` (hors token), sea `#245765`. Deux liens du héros (« Voir les dimensions », « Annonce Apple ») sans anneau détecté. |
| Titre display | Graisse 640, interlettrage −0,065 em | `.font-display` à 580 / −0,035 em (`studio.css:17`). |
| Mono jamais en gras | 400 et 500 seulement | `.tool-step-mark` à 700 (`studio.css:633`), `.preview-empty-size` à 600 (`:680`). |
| Rayons | 0,7 / 0,8 / 1,25 rem | ≈ 40 % des déclarations conformes ; `.ds-seg` à 0,6 rem (`globals.css:357`, `studio.css:328`) contre 0,8 rem ; `.ds-drop` 28 px ; `.tool-canvas` 1,2 rem. |
| Petit texte | ≥ 0,75 rem (12 px) | ≈ 50 déclarations entre 0,62 et 0,74 rem. À l'écran : pilule « INVITÉ » 9,9 px, sélecteur de langue « ENGLISH » 10,9 px, libellé « SET » 10,9 px, sur-titre « VOTRE COMPOSITION » 10,6 px, badge « Exemple » 10,2 px, « PAIRES » 11,2 px, bouton « Nouveau set » 11,2 px, « 2 mois offerts » 11,2 px, noms de fichiers de la preuve 11,2 px. |
| Cibles tactiles | ≥ 24 px (pied de page, liens inline) | Liens `.ds-link` du pied de page et des textes à 16–21 px de haut (« Confidentialité » 85×16 sur home et pricing, « Retour à la connexion » 144×18, liens des CGU dans l'inscription 16 px). Dans l'atelier : « Renommer » 65×19, bouton « Confirmer le contenu de l'app » 176×18, case `confirm-app-usage` 13×13. |
| Contraste | — | Textes de l'interface conformes. Un cas limite : « Aperçu de la revue » à 4,41:1 (`#627981` sur `#f8fbfa`). |
| Un h1 par page | — | Respecté sur toutes les pages, sauf dans l'atelier quand la modale d'inscription est ouverte. |
| Défilement horizontal | — | Aucun, sur aucune page, aux deux largeurs. |

### 5.3 Composants

- Pas de composant `Button` : 15 chaînes de classes différentes pour `.ds-cta` / `.ds-cta-ghost` sur 20 fichiers, et des styles parallèles (`.tool-demo-button` à fond sea clair, `.tool-empty-action` défini deux fois, `.tool-mobile-action`, `.studio-tool-journey a`). Un composant avec `variant` et `size` fermerait la dérive.
- Largeurs de contenu : `max-w-2xl`, `3xl`, `4xl`, `6xl`, `md` et `92rem` selon la page ; marges verticales `py-12`, `py-16`, `py-20` ; h1 de `text-3xl` à `text-5xl` sans règle. Fixer trois gabarits (document 3xl, formulaire md, application 92rem) et une échelle de h1.
- Revue et landing montrent des coques, le canevas de l'atelier des écrans nus : choisir une représentation du device par contexte et la documenter dans `DESIGN.md`.
- Dans la table de comparaison, le rendu est propre et la colonne Indie est bien mise en avant par un fond sea léger.

## 6. Accessibilité

- Points positifs : lien d'évitement présent, menu mobile inerte quand fermé et fermé par Échap, `aria-current` sur la navigation, boîtes de dialogue avec piège de focus et bouton Fermer visible, régions `role=status` pour les vérifications, champs de l'atelier tous libellés, aucun bouton sans nom accessible mesuré.
- À corriger : trois couleurs d'anneau de focus et deux liens sans anneau (5.2) ; cibles de 16–19 px sur les liens inline et le pied de page ; case de confirmation de 13 px ; second h1 avec la modale ; erreur d'invitation sans `role` ; champ d'invitation sans libellé visible ; état « introuvable » de la revue sans titre ; sélecteur de langue à 10,9 px en capitales ; libellé du sélecteur de langue écrit dans la langue cible seulement (`locale-switch.tsx:25`), acceptable mais à confirmer avec un lecteur d'écran.
- Mouvement : les trois chemins de mouvement réduit (globals, studio, transitions) fonctionnent, la landing reste complète sans script.

## 7. Internationalisation

- Quatre clés manquantes côté client (P0-1).
- Chaînes codées en dur visibles : `"Orientation"`, `"Pixels"`, `"iPhone"`, `"Portrait"` (`specs-page.tsx:20-30`), `"Pixels"`, `"Dimensions"`, `"Opaque, sRGB"`, `"Score"`, `"Harbor · set 01"`, `" px · portrait"` (`home-page.tsx:50,139-155,244`), `"Email"` (`password-recovery.tsx:61`), placeholder `"App"` (`captures-panel.tsx:130`), `"Composition NN"` (`tool-app.tsx:75`, `sets-store.ts:40`), `"6.9"` sans ″ ni virgule française (`delivery-actions.tsx:101`), noms de fichiers démo `ferme`/`ouvert` en anglais (`demo.tsx:22`), codes bilingues de `/rejet`.
- Clés empruntées à d'autres zones : `asct_close` pour fermer le paywall et la modale d'auth, `asct_file_complete` pour une invitation acceptée, `home_technical_checks` dans le bilan, `home_approve` / `home_needs_work` dans la revue. Un renommage par zone évite qu'une modification de texte sur une page en casse une autre.
- Noms de clés générés (`tool_i_checked_that_every`, `account_teammate_studio_com`) mêlés à des noms lisibles.

## 8. Recommandations priorisées

Convention : P0 bloque ou casse une conversion ou contredit la promesse publique ; P1 dégrade visiblement la confiance ou l'efficacité ; P2 dette de système. Effort : S moins d'une demi-journée, M une à deux journées, L plus.

| Prio | Action | Effort | Fichiers |
| --- | --- | --- | --- |
| P0 | Renommer `google`/`email`/`password`/`magic` en `auth_*`, régénérer `CLIENT_KEYS`, étendre le test aux clés sans `_` | S | `auth-form.tsx`, `fr.ts`, `en.ts`, `client-boundary.test.ts`, `client-keys.ts` |
| P0 | Migrer automatiquement les brouillons « guest » vers le compte au premier login, avec message de confirmation | M | `tool-app.tsx`, `sets-store.ts` |
| P0 | Paywall invité : masquer la bascule 6,9″ ou ouvrir l'inscription d'abord ; ne jamais afficher « paiements pas ouverts » quand `checkoutAvailable` est vrai | S | `adjust-panel.tsx`, `paywall-modal.tsx`, `tool-app.tsx` |
| P0 | Un seul nom pour le plan gratuit et une seule unité de quota, prix lus depuis `plans.ts` dans la copie | M | `fr.ts`, `en.ts`, `faq.ts`, `pricing/page.tsx`, `PRODUCT.md`, `DESIGN.md` |
| P1 | Afficher les messages de l'atelier sur les quatre étapes | S | `tool-app.tsx:763` |
| P1 | Message « Connectez-vous » aligné sur la modale d'inscription ; un seul chemin d'inscription depuis l'export | S | `use-render-jobs.ts`, `delivery-actions.tsx` |
| P1 | Passer le drapeau de disponibilité serveur à la section tarifs de la home ; retirer la bascule mensuel/annuel de la home | S | `home-page.tsx`, `page.tsx` |
| P1 | En-tête : « Créer un compte » en secondaire ; CTA de clôture après la FAQ ; carte Essai vers `/tool` | S | `header-auth.tsx`, `home-page.tsx`, `pricing-section.tsx` |
| P1 | Un seul état vide dans l'atelier ; confirmation avant suppression d'un set ; h1 stable pendant le renommage ; `aria-modal` sans second h1 | M | `demo.tsx`, `canvas.tsx`, `preview-card.tsx`, `set-picker.tsx`, `set-title.tsx`, `auth-form.tsx` |
| P1 | Compte : rôles, statuts et erreurs traduits ; dialogue partagé pour la suppression ; libellé visible du champ d'invitation | M | `account-app.tsx` |
| P1 | Revue client : en-tête réduit sans CTA d'inscription ; invitation avec en-tête, `role=alert`, message d'erreur explicite | S | `review-page.tsx`, `r/[id]/page.tsx`, `invite-accept.tsx` |
| P1 | Démo : ZIP exemple téléchargeable sans confirmation humaine ; mode opératoire Connect sur l'écran Exporter | S | `tool-app.tsx:620-622`, `delivery-actions.tsx` |
| P1 | Tokens manquants, remplacement des hex de `studio.css`, suppression des redéfinitions `.ds-*`, une seule couleur de focus | L | `studio.css`, `globals.css`, `DESIGN.md` |
| P1 | Cibles ≥ 24 px sur `.ds-link`, « Renommer », case de confirmation | S | `globals.css`, `studio.css`, `check-panel.tsx` |
| P2 | Composant `Button` partagé ; trois gabarits de page ; échelle de h1 | M | `src/components/ui/*` (nouveau), pages |
| P2 | Rayons alignés sur 0,7 / 0,8 / 1,25 rem ; tailles de texte ≥ 0,75 rem ; mono jamais en gras ; display à 640 / −0,065 em ou mise à jour de `DESIGN.md` | M | `studio.css`, `globals.css` |
| P2 | Chaînes codées en dur et clés empruntées déplacées dans les dictionnaires par zone ; mentions légales dans les dictionnaires | M | `src/lib/i18n/*`, pages citées en 7 |
| P2 | `DESIGN.md` : quatre étapes de l'atelier, tokens complets, position unique sur App Store Connect et sur les coques | S | `DESIGN.md` |

## 9. Annexes

### 9.1 Captures (`audit/2026-10-13/`)

| Fichier | Ce qu'il montre |
| --- | --- |
| `home-fold-800.desktop.fr.png`, `home-fold.mobile.fr.png` | Héros au-dessus du pli, deux écrans complets, deux CTA primaires concurrents dans l'en-tête et le héros |
| `home.desktop.fr.png`, `home.mobile.fr.png`, `home.desktop.en.png` | Landing complète, « Paiements bientôt ouverts » sur les cartes Indie et Studio, pas de CTA de clôture |
| `home-menu.mobile.fr.png`, `home-consent.mobile.fr.png` | Menu mobile ouvert, bandeau de consentement |
| `pricing.desktop.fr.png`, `pricing.mobile.fr.png`, `pricing.desktop.en.png` | Cartes, bande Studio, table, deux FAQ empilées |
| `pricing-indie-anonymous-result.desktop.fr.png` | Clic Indie en visiteur : atelier vide + modale d'inscription |
| `login.desktop.fr.png`, `signup.mobile.fr.png`, `signup.desktop.en.png`, `forgot-password.desktop.fr.png` | Clés brutes `google`, `email`, `password`, `magic` |
| `tool-empty.desktop.fr.png`, `tool-empty.mobile.fr.png`, `tool-empty-fold.desktop.fr.png` | Trois états vides superposés, dock collant sur « Nom de l'app » |
| `tool-demo-captures/adjust/review/export.desktop.fr.png` et `.mobile.fr.png` | Quatre étapes avec l'exemple Harbor |
| `tool-demo-adjust-advanced.*.png` | Réglages avancés, bascule 6,9″ |
| `tool-guest-paywall-69.desktop.fr.png`, `.mobile.fr.png` | Paywall invité, boutons désactivés, « paiements pas encore ouverts » |
| `tool-guest-imported/review/export/export-ready.desktop.fr.png` | Parcours invité avec ses propres fichiers jusqu'à « Préparer les fichiers » |
| `tool-guest-auth-modal.desktop.fr.png`, `.mobile.fr.png` | Modale d'inscription au téléchargement, clés brutes, second h1 |
| `tool-after-login-drafts-lost.desktop.fr.png` | Après connexion : atelier vide, lien « Récupérer explicitement… » |
| `tool-set-picker-open.desktop.fr.png` | Sélecteur de set |
| `tool-paywall-free.desktop.fr.png`, `tool-logged-free.desktop.fr.png` | Paywall compte gratuit épuisé, pilule « Essais utilisés » |
| `account-free/indie/studio.desktop.fr.png`, `account-free.mobile.fr.png` | Compte par plan, rôles et statuts bruts |
| `review-harbor.desktop.fr.png`, `.mobile.fr.png` | Revue client avec en-tête marketing et coques |
| `invite-invalid.desktop.fr.png` | Invitation invalide sans message d'erreur |
| `specs/why-not-ai/rejection/legal/privacy/cookies/*.png` | Pages secondaires et gabarits |

### 9.2 Reproduire les mesures

```bash
CYPRESS_INSTALL_BINARY=0 npm ci
NEXT_PUBLIC_SUPABASE_URL=https://supabase.example.invalid \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-placeholder \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
E2E_CHECKOUT_DISPLAY=true NEXT_TELEMETRY_DISABLED=1 npm run dev
```

Puis parcourir les routes avec Playwright et Chromium, cookie `duoshot_locale_manual=fr|en`, `reducedMotion: reduce`, et pour le compte un cookie `sb-supabase-auth-token` factice avec interception de `/auth/v1/user` et `/api/billing/status` comme dans `cypress/support/commands.ts`. Les scripts de mesure n'ont pas été ajoutés au dépôt ; l'intégration recommandée est un test Cypress par page qui vérifie l'absence de clé brute (texte égal à une clé de `fr.ts`), un seul h1, et les cibles de 24 px, en plus de la capture `atelier-mobile-390` existante.

### 9.3 Checklist de re-vérification

- [ ] `/login`, `/signup` et la modale affichent « Continuer avec Google », « E-mail », « Mot de passe », « Lien magique » en FR et EN.
- [ ] Import en invité → inscription → les paires sont présentes sans action supplémentaire.
- [ ] Bascule 6,9″ en invité → inscription ou paywall avec boutons actifs, jamais « paiements pas ouverts » quand Checkout est ouvert.
- [ ] Un seul nom de plan gratuit et une seule unité de quota sur home, pricing, atelier, paywall, compte.
- [ ] Home : un seul bouton primaire visible au-dessus du pli, CTA après la FAQ, cartes payantes actives dès le rendu serveur.
- [ ] Au clavier, une seule couleur d'anneau de focus sur home, pricing, atelier, compte.
- [ ] Aucun texte d'interface sous 12 px ; aucun lien ou bouton sous 24 px de haut.
- [ ] `grep -c "#" src/app/studio.css` ne renvoie plus que les tokens et le contenu Harbor.
